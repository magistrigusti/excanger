import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import yauzl from "yauzl";
import { LokaliseFileExchange } from './LokaliseFileExchange.js';
import type { DownloadTransactionParams } from '../interfaces/DownloadTranslationParams.js';
import { LokaliseError } from '../errors/LokaliseError.js';
import type { 
  DownloadedFileProcessDetails, DownloadFileParams, DownloadBundle, QueuedProcess,
} from '@lokalise/node-api';

export class LokaliseDownload extends LokaliseFileExchange {
  private readonly streamPipeline = promisify(pipeline);

  private static readonly defaultProcessParams = {
    asyncDownload: false,
    pollInitialWaitTime: 1000,
    pollMaximumWaitTime: 120_000,
    buindleDownloadTimeout: undefined,
  };

  async downloadTransactions({
    downloadFileParams,
    extractParams = {},
    ProcessDownloadFileParams,
  }: DownloadTransactionParams): Promise<void> {
    const {
      asyncDownload,
      pollInitialWaitTime,
      pollMaximumWaitTime,
      bundleDownloadTimeout,
    } = {
      ...LokaliseDownload.defaultProcessParams,
      ...ProcessDownloadFileParams,
    };

    let translationsBundleURL: string;

    if (asyncDownload) {
      const downloadProcess = await this.getTranslationsBundleAsync(downloadFileParams);
      const completedProcess = (
        await this.pollProcesses(
          [downloadProcess],
          pollInitialWaitTime,
          pollMaximumWaitTime
        )
      )[0];

      if (completedProcess.status === "finished") {
        const completedProcessDetails = completedProcess.details as DownloadedFileProcessDetails;

        translationsBundleURL = completedProcessDetails.download_url;
      } else {
        throw new LokaliseError(`
          Download took too long to finalize: gave up after ${pollMaximumWaitTime}ms
        `);
      }
    } else {
      const translationsBundle = await this.getTranslationsBundle(downloadFileParams);
      translationsBundleURL = translationsBundle.bundle_url;
    }

    const zipFilePath = await this.downloadZip(
      translationsBundleURL,
      bundleDownloadTimeout,
    );

    try {
      await this.unpackZip(
        zipFilePath,
        path.resolve(extractParams.outputDir ?? "./"),
      );
    } finally {
      await fs.promises.unlink(zipFilePath);
    }
  }

  protected async downloadZip(
    url: string,
    downloadTimeout: number | undefined,
  ): Promise<string> {
    const tempZipPath = path.join(
      os.tmpdir(),
      `lokalise-translations-${Date.now()}.zip`,
    );

    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;
    let response: Response;

    if (downloadTimeout && downloadTimeout > 0) {
      timeoutId = setTimeout(() => controller.abort(), downloadTimeout);
    }

    try {
      response = await fetch(url, {
        signal: controller.signal,
      });
    } catch(err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          throw new LokaliseError(
            `Request timed out after ${downloadTimeout}ms`,
            408,
          );
        }

        throw new LokaliseError(err.message)
      }

      throw new LokaliseError(
        "Unknown error",
        500,
        { reason: String(err) }
      );
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }

    const body = response.body;
    if (!body) {
      throw new LokaliseError("Response body is null");
    }

    await this.streamPipeline(body, fs.createWriteStream(tempZipPath));
    return tempZipPath;
  }

  protected async unpackZip(
    zipFilePath: string,
    outputDir: string,
  ): Promise<void> {
    const createDir = async (dir: string): Promise<void> => {
      await fs.promises.mkdir(dir, { recursive: true });
    };

    return new Promise((resolve, reject) => {
      yauzl.open(zipFilePath, { lazyEntries: true}, async (err, zipfile) => {
        if (err) {
          return reject(
            new LokaliseError(
              `Failed to open ZIP: ${zipFilePath}: ${err.message}`
            )
          );
        }

        if (!zipfile) {
          return reject(
            new LokaliseError("ZIP is invalid")
          );
        }

        zipfile.readEntry();

        zipfile.on("entry", async (entry) => {
          try {
            const fullPath = path.resolve(outputDir, entry.fileName);
            const relative = path.relative(outputDir, fullPath);
            if (relative.startsWith("..") || path.isAbsolute(relative)) {
              throw new LokaliseError("Malicious zip entry");
            }

            if(/\/$/.test(entry.fileName)) {
              await createDir(fullPath);

              zipfile.readEntry();
            } else {
            await createDir(path.dirname(fullPath));
            const writeStream = fs.createWriteStream(fullPath);

            zipfile.openReadStream(entry, (readErr, readStream) => {
              if (readErr || !readStream) {
                return reject(
                  new LokaliseError("failed to read")
                )
              }

              readStream.pipe(writeStream);
              writeStream.on("finish", () => zipfile.readEntry());
              writeStream.on("error", reject);
            })
          }
          } catch (error) {
            return reject(error);
          }
        });

        zipfile.on("end", () => resolve());
        zipfile.on("error", reject);
      })
    });
  }

  protected async getTranslationsBundle(
    downloadFileParams: DownloadFileParams
  ): Promise<DownloadBundle> {
    return this.withExponentialBackoff(() => 
      this.apiClient.files().download(this.projectId, downloadFileParams)
    );
    
  }

  protected async getTranslationsBundleAsync(
    downloadFileParams: DownloadFileParams,
  ): Promise<QueuedProcess> {
    return this.withExponentialBackoff(() =>
      this.apiClient.files().async_download(this.projectId, downloadFileParams),
    );
  }
}
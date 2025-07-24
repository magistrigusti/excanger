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
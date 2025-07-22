import fs from "node:fs";
import path from "node:path";
import { LokaliseFileExchange } from './LokaliseFileExchange.js';
import type { UploadTransactionParams } from '../interfaces/UploadTransactionParams.js';
import type { FileUploadError } from '../interfaces/FileUploadError.js';
import type { PartialUploadFileParams } from "../interfaces/PartialUploadFileParams.js";
import type { QueuedProcess, UploadFileParams } from '@lokalise/node-api';
import type { CollectFileParams } from '../interfaces/CollectFileParams.js';
import type { ProcessedFile } from "../interfaces/ProcessedFile.js";

export class LokaliseUpload extends LokaliseFileExchange {
  private readonly maxConcurrentProcesses = 6;

  async uploadTransactions(
    uploadTransactionParams: UploadTransactionParams = {},
  ): Promise<{
    processes: QueuedProcess[];
    errors: FileUploadError[];
  }> {

    const {
      uploadFileParams, collectFileParams, processUploadFileParams
    } = uploadTransactionParams;

    const defaultPollingParams = {
      pollStatuses: false,
      pollInitialWaitTime: 1000,
      pollMaximomWaitTime: 120_000,
    }

    const { pollStatuses, pollInitialWaitTime, pollMaximumWaitTime } = {
      ...defaultPollingParams,
      ...processUploadFileParams,
    };

    const collectedFiles = await this.collectFiles(collectFileParams);

    const { processes, errors } = await this.parallelUpload(
      collectedFiles,
      uploadFileParams,
      processUploadFileParams?.languageInferrer,
      processUploadFileParams?.filenameInferrer,
    );

    let completedProcesses = processes;

    if (pollStatuses) {
      completedProcesses = await this.pollProcesses(
        processes,
        pollInitialWaitTime,
        pollMaximumWaitTime
      );
    }

    return { processes: completedProcesses, errors };
  }

  protected async collectFiles({
    inputDirs = ["./locales"],
    extensions = [".*"],
    excludePatterns = ["node_modules", "dist"],
    recursive = true,
    fileNamePattern = ".*",
  }: CollectFileParams = {}): Promise<string[]> {
    const collectedFiles: string[] = [];

    const normalizedExtensions = extensions.map((ext) => ext.startsWith(".") ? ext : `.${ext}`,);

    let regexPattern: RegExp;
    try {
      regexPattern = new RegExp(fileNamePattern);
    } catch {
      throw new Error(`Invalid fileNamePattern: ${fileNamePattern}`);
    }

    const queue: string[] = [...inputDirs.map((dir) => path.resolve(dir))];

    while (queue.length > 0) {
      const dir = queue.shift();
      if (!dir) {
        continue;
      }

      let entries: fs.Dirent[];
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch {
        console.warn(`Skipping directory: ${dir}`);
        continue;
      }

      for (const entry of entries) {
        const fullPath = path.resolve(dir, entry.name);

        if (excludePatterns.some((pattern) => fullPath.includes(pattern))) {
          continue;
        }
        
        if (entry.isDirectory() && recursive) {
          queue.push(fullPath);
        } else if (entry.isFile()) {
          const fileExt = path.extname(entry.name);

          const matchesExtension = 
            normalizedExtensions.includes(".*") ||
            normalizedExtensions.includes(fileExt);

            const matchesPattern = regexPattern.test(entry.name);

            if (matchesExtension && matchesPattern) {
              collectedFiles.push(fullPath)
            }
        }
      }
    }

    return collectedFiles;
  }

  protected async parallelUpload(
    files: string[],
    baseUploadFileParams: PartialUploadFileParams,
    languageInferer?: (filePath: string) => Promise<string> | string,
    filenameInferer?: (filePath: string) => Promise<string> | string,
  ): Promise<{
    processes: QueuedProcess[];
    errors: FileUploadError[];
  }> {
    const queuedProcesses: QueuedProcess[] = [];
    const errors: FileUploadError[] = [];
    const projectRoot = process.cwd();

    const pool = new Array(this.maxConcurrentProcesses).fill(null).map(() => (
      async () => {
        while (files.length > 0) {
          const file = files.shift();
          if (!file) {
            break;
          }

          try {
            const processedFileParams = await this.processFile(
              file,
              projectRoot,
              languageInferer,
              filenameInferer,
            );

            const queuedProcess = await this.uploadSingleFile({
              ...baseUploadFileParams,
              ...processedFileParams
            });
            queuedProcesses.push(queuedProcess);

          } catch (error) {
            errors.push({ file, error });
          }
        }
      })(),
    );

    await Promise.all(pool);
    return { processes: queuedProcesses, errors }
  }

  protected async processFile(
    file: string,
    projectRoot: string,
    languageInferer?: (filePath: string) => Promise<string> | string,
    filenameInferer?: (filePath :string) => Promise<string> | string,
  ): Promise<ProcessedFile> {
    let relativePath: string;
    try {
      relativePath = filenameInferer ? await filenameInferer(file) : "";
      if (!relativePath.trim()) {
        throw new Error("Invalid filename");
      }
    } catch {
      relativePath = path.posix.relative(
        projectRoot.split(path.sep).join(path.posix.sep),
        file.split(path.sep).join(path.posix.sep),
      );
    }

    let languageCode: string;
    try {
      languageCode = languageInferer ? await languageInferer(file) : "";
      if (!languageCode.trim()) {
        throw new Error("Invalid lang code");
      }
    } catch {
      languageCode = path.parse(path.basename(relativePath)).name;
    }

    const fileContent = await fs.promises.readFile(file);
    const base64Data = fileContent.toString("base64");

    return {
      data: base64Data,
      filename: relativePath,
      lang_iso: languageCode,
    }
  }

  protected async uploadSingleFile(
    uploadParams: UploadFileParams
  ): Promise<QueuedProcess> {
    return this.withExponentialBackoff(() =>
      this.apiClient.files().upload(this.projectId, uploadParams),
    );
  }
}
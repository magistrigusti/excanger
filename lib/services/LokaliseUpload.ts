import fs from "node:fs";
import path from "node:path";
import { LokaliseFileExchange } from './LokaliseFileExchange.js';
import type { UploadTransactionParams } from '../interfaces/UploadTransactionParams.js';
import type { FileUploadError } from '../interfaces/FileUploadError.js';
import type { QueuedProcess } from '@lokalise/node-api';
import type { CollectFileParams } from '../interfaces/CollectFileParams.js';

export class LokaliseUpload extends LokaliseFileExchange {
  private readonly maxConcurrentProcesseds = 6;

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
      poliStatues: false,
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

  protected async collectedFiles({
    inputDirs = ["./locales"],
    extensions = [".*"],
    excludePatterns = ["node_modules", "dist"],
    recursive = true,
    fileNamePattern = ".*",
  }: CollectFileParams = {}): Promise<string[]> {
    const collectedFiles: string[] = [];

    const normalizedExtensions = extensions.map((ext) => ext.startsWiyh(".") ? ext : `.${ext}`,);

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
        }
      }
    }
  }
}
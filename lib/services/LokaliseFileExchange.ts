import { LokaliseError } from "../errors/LokaliseError.js";
import type { LokaliseExchangeConfig } from "../interfaces/LokaliseExchangeConfig.js";
import { LokaliseApiOAuth, LokaliseApi, ApiError as LokaliseApiError } from "@lokalise/node-api";
import type { ClientParams, QueuedProcess } from "@lokalise/node-api";
import type { RetryParams } from "../interfaces/RetryParams.js";

export class LokaliseFileExchange {
  protected readonly projectId: string;
  public readonly apiClient: LokaliseApi;
  protected readonly retryParams: RetryParams;

  private static readonly defaultRetryParams: RetryParams = {
    maxRetries: 3,
    initialSleepTime: 1000,
  };

  private readonly PENDING_STATUSES = [
    "queued",
    "pre_processing",
    "running",
    "post_procesing"
  ];

  private readonly FINISHED_STATUSES = ["finished", "cancelled", "failed"];

  constructor(clientConfig: ClientParams, exchangeConfig: LokaliseExchangeConfig ) {
    if (
      !exchangeConfig.projectId || 
      typeof exchangeConfig.projectId !== "string" 
    ) {
      throw new LokaliseError("Invalid or missing project ID");
    }

    if(!clientConfig.apiKey || typeof clientConfig.apiKey !== 'string') {
      throw new LokaliseError("Invalid or missing API token");
    }

    this.projectId = exchangeConfig.projectId;

    const { useOAuth2 = false } = exchangeConfig;

    if (useOAuth2) {
      this.apiClient = new LokaliseApiOAuth(clientConfig);
    } else {
      this.apiClient = new LokaliseApi(clientConfig);
    }

    this.retryParams = {
      ...LokaliseFileExchange.defaultRetryParams,
      ...exchangeConfig.retryParams,
    };
  }

  protected async withExponentialBackoff<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    const { maxRetries, initialSleepTime } = this.retryParams;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        if (
          error instanceof LokaliseApiError &&
          (error.code === 429 || error.code === 408)
        ) {
          if (attempt === maxRetries + 1) {
            throw new LokaliseError(
              `Maximum retries reached: ${error.message ?? "Unknon error"}`,
              error.code,
              error.details
            );
          }

          await this.sleep(initialSleepTime * 2 ** (attempt - 1));
        } else if (error instanceof LokaliseApiError) {
          throw new LokaliseError(error.message, error.code, error.details);
        } else {
          throw error;
        }
      }
    }

    throw new LokaliseError("Unexpected error");
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async pollProcesses(
    processes: QueuedProcess[],
    initialWaitTime: number,
    maxWaitTime: number,
  ): Promise<QueuedProcess[]> {
    const startTime = Date.now();
    let waitTime = initialWaitTime;

    const processMap = new Map<string, QueuedProcess>();

    const pendingProcessIds = new Set<string>();

    for (const process of processes) {
      if (!process.status) {
        process.status = "queued";
      }

      processMap.set(process.process_id, process);

      if (this.PENDING_STATUSES.includes(process.status)) {
        pendingProcessIds.add(process.process_id)
      }
    }

    while (pendingProcessIds.size > 0 && Date.now() - startTime < maxWaitTime) {
      await Promise.all(
        [...pendingProcessIds].map(async (processId) => {
          try {
            const updatedProcess = await this.apiClient
              .queuedProcesses()
              .get(processId, { project_id: this.projectId });

            if (!updatedProcess.status) {
              updatedProcess.status = "queued";
            }

            processMap.set(processId, updatedProcess);

            if (this.FINISHED_STATUSES.includes(updatedProcess.status)) {
              pendingProcessIds.delete(processId);
            }
          } catch (_error) {
            console.warn(`Failed to fetch process ${processId}:`, _error);
          }
        }),
      );

      if (
        pendingProcessIds.size === 0 ||
        Date.now() - startTime >= maxWaitTime
      ) {
        break;
      }

      await this.sleep(waitTime);
      waitTime = Math.min(waitTime * 2, maxWaitTime - (Date.now() - startTime));
    }

    return Array.from(processMap.values());
  }
}
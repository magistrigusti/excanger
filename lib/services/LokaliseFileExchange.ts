import { LokaliseError } from "../errors/LokaliseError.js";
import type { LokaliseExchangeConfig } from "../interfaces/LokaliseExchangeConfig.js";
import { LokaliseApiOAuth, LokaliseApi, ApiError as LokaliseApiError } from "@lokalise/node-api";
import type { ClientParams } from "@lokalise/node-api";
import type { RetryParams } from "../interfaces/RetryParams.js";

export class LokaliseFileExchange {
  protected readonly projectId: string;
  public readonly apiClient: LokaliseApi;
  protected readonly retryParams: RetryParams;

  private static readonly defaultRetryParams: RetryParams = {
    maxRetries: 3,
    initialSleepTime: 1000,
  };

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
        }
      }
    }
  }
}
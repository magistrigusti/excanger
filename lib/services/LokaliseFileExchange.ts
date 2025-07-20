import { LokaliseError } from "../errors/LokaliseError.js";
import type { LokaliseExchangeConfig } from "../interfaces/LokaliseExchangeConfig.js";
import { LokaliseApiOAuth, LokaliseApi } from "@lokalise/node-api";
import type { ClientParams } from "@lokalise/node-api";

export class LokaliseFileExchange {
  protected readonly projectId: string;
  public readonly apiClient: LokaliseApi;

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
  }
}
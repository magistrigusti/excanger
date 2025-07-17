import { LokaliseError } from "../errors/LokaliseError.js";
import type { LokaliseExchangeConfig } from "../interfaces/LokaliseExchangeConfig.js";

export class LokaliseFileExchange {
  protected readonly projectId: string;

  constructor( exchangeConfig: LokaliseExchangeConfig ) {
    if (
      !exchangeConfig.projectId || typeof exchangeConfig.projectId !== "string" 
    ) {
      throw new LokaliseError("Invalid or missing project ID");
    }

    this.projectId = exchangeConfig.projectId;
  }
}
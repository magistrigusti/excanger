import type { RetryParams } from "./RetryParams.js";

export interface LokaliseExchangeConfig {
  projectId: string;
  useOAuth2?: boolean;
  retryParams?: Partial<RetryParams>;
}
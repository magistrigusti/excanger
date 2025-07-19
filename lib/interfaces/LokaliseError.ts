export interface LokaliseError {
  message: string;

  code?: number;

  details?: Record<string, string | number>;
}
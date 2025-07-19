import type { LokaliseError as ILokaliseError } from "../interfaces/LokaliseError.js"

export class LokaliseError extends Error implements ILokaliseError {
  code?: number;
  details?: Record<string, string | number >;

  constructor(message: string, code?: number, details?: Record<string, any>) {
    super(message);

    this.code = code;
    this.details = details;
  }

  override toString(): string{
    let baseMessage = `LokaliseError: ${this.message}`;

    if (this.code) {
      baseMessage += `(Code: ${this.code})`;
    }
    if (this.details) {
      const formattedDetails = Object.entries(this.details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");

      baseMessage += ` | Details: ${formattedDetails}`;
    }
    return baseMessage;
  }
}
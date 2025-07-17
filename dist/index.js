// lib/errors/LokaliseError.ts
var LokaliseError = class extends Error {
  code;
  details;
  constructor(message, code, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
  toString() {
    let baseMessage = `LokaliseError: ${this.message}`;
    if (this.code) {
      baseMessage += `(Code: ${this.code})`;
    }
    if (this.details) {
      const formattedDetails = Object.entries(this.details).map(([key, value]) => `${key}: ${value}`).join(", ");
      baseMessage += ` | Details: ${formattedDetails}`;
    }
    return baseMessage;
  }
};

// lib/services/LokaliseFileExchange.ts
var LokaliseFileExchange = class {
  projectId;
  constructor(exchangeConfig) {
    if (!exchangeConfig.projectId || typeof exchangeConfig.projectId !== "string") {
      throw new LokaliseError("Invalid or missing project ID");
    }
    this.projectId = exchangeConfig.projectId;
  }
};

// lib/services/LokaliseDownload.ts
var LokaliseDownload = class extends LokaliseFileExchange {
};

// lib/services/LokaliseUpload.ts
var LokaliseUpload = class extends LokaliseFileExchange {
};
export {
  LokaliseDownload,
  LokaliseUpload
};
//# sourceMappingURL=index.js.map
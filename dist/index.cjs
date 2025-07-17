"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lib/index.ts
var index_exports = {};
__export(index_exports, {
  LokaliseDownload: () => LokaliseDownload,
  LokaliseUpload: () => LokaliseUpload
});
module.exports = __toCommonJS(index_exports);

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LokaliseDownload,
  LokaliseUpload
});
//# sourceMappingURL=index.cjs.map
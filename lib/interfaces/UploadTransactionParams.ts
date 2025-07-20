
import type { CollectFileParams } from "./CollectFileParams.js";
import type { PartialUploadFileParams } from "./PartialUploadFileParams.js";
import type { ProcessUploadFileParams } from "./ProcessUploadFileParams.js";

export interface UploadTransactionParams {
  uploadFileParams?: PartialUploadFileParams;
  collectFileParams?: CollectFileParams;
  processUploadFileParams?: ProcessUploadFileParams;
}

export interface ProcessUploadFileParams {
  languageInferrer?: (filePath: string) => Promise<string> | string;
  filenameInferrer?: (filePath: string) => Promise<string> | string;
  poliStatuses?: boolean;
  pollInitialWaitTime?: number;
  pollMaximumWaitTime?: number;
}
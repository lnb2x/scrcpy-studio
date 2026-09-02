export interface AppErrorPayload {
  code: string;
  message: string;
  details?: string;
  recoverable: boolean;
  suggestedAction?: string;
}

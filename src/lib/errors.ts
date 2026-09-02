import type { AppErrorPayload } from '@/types/error';

export function normalizeAppError(error: unknown, fallbackCode = 'UNKNOWN_ERROR'): AppErrorPayload {
  if (typeof error === 'object' && error !== null) {
    const value = error as Record<string, unknown>;
    if (typeof value.message === 'string') {
      return {
        code: typeof value.code === 'string' ? value.code : fallbackCode,
        message: value.message,
        details: typeof value.details === 'string' ? value.details : undefined,
        recoverable: typeof value.recoverable === 'boolean' ? value.recoverable : true,
        suggestedAction:
          typeof value.suggestedAction === 'string' ? value.suggestedAction : undefined,
      };
    }
  }

  return {
    code: fallbackCode,
    message: error instanceof Error ? error.message : String(error),
    recoverable: true,
  };
}

export function formatAppError(error: unknown, fallbackCode?: string): string {
  const normalized = normalizeAppError(error, fallbackCode);
  const details = normalized.details && normalized.details !== normalized.message
    ? ` ${normalized.details}`
    : '';
  const action = normalized.suggestedAction ? ` ${normalized.suggestedAction}` : '';
  return `${normalized.message}${details}${action}`.trim();
}

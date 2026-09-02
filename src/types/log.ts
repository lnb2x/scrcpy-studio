export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: number;
  sessionId?: string;
  source?: string;
  level: LogLevel | string;
  message: string;
  raw: string;
}

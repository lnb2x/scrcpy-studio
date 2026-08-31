export type LogLevel = 'INFO' | 'ADB' | 'SCRCPY' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: number;
  sessionId?: string;
  level: LogLevel | string;
  message: string;
  raw: string;
}

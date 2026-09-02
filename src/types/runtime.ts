export type RuntimeStatus = 'ready' | 'missing' | 'error';

export interface RuntimeComponent {
  name: string;
  path?: string;
  version?: string;
  status: RuntimeStatus;
  message: string;
}

export interface EnvironmentDiagnostics {
  scrcpy: RuntimeComponent;
  adb: RuntimeComponent;
  deviceCount: number;
  deviceStates: string[];
  checkedAt: number;
}

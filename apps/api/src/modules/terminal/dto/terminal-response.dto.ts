export interface TerminalCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  cwd: string;
}

export interface TerminalStatusResult {
  active: boolean;
  sessionId: string;
  labSlug: string;
  prompt: string;
  banner: string;
}

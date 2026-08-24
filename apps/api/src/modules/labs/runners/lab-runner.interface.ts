/**
 * Interface d'abstraction pour les exécuteurs de labs (LabRunner)
 * Conforme à la spécification contractuelle OpenSIO (§26.6).
 */

export interface EditedFile {
  path: string;
  content: string;
}

export interface LabSessionContext {
  sessionId: string;
  labSlug: string;
  labLevel: string;
  definitionPath: string;
  runtimeRef?: Record<string, unknown> | null;
}

export interface ValidatorCheckResult {
  id: string;
  passed: boolean;
  points: number;
  message: string;
  maxPoints?: number;
}

export interface ValidatorVerdict {
  passed: boolean;
  score: number;
  checks: ValidatorCheckResult[];
}

export interface RuntimeRef {
  kind: 'simulation' | 'docker' | 'proxmox';
  workDir?: string;
  containerId?: string;
  vmId?: string;
  [key: string]: unknown;
}

export interface RuntimeStatus {
  active: boolean;
  details?: Record<string, unknown>;
}

export const LAB_RUNNER_TOKEN = Symbol('LAB_RUNNER_TOKEN');

export interface LabRunner {
  readonly kind: 'simulation' | 'docker' | 'proxmox';
  start(session: LabSessionContext): Promise<RuntimeRef>;
  saveFiles(session: LabSessionContext, files: EditedFile[]): Promise<void>;
  getFiles(session: LabSessionContext, editablePaths?: string[]): Promise<EditedFile[]>;
  validate(session: LabSessionContext, files?: EditedFile[]): Promise<ValidatorVerdict>;
  stop(session: LabSessionContext): Promise<void>;
  status(session: LabSessionContext): Promise<RuntimeStatus>;
}

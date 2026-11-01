/**
 * TUM CyberMesh — SOAR Playbook Domain Types
 * Strict Clean Architecture (Zero External Dependencies)
 */

export type MitreTechniqueId = 'T1059' | 'T1078' | 'T1486' | 'T1003' | 'T1562.001' | 'T1071';

export type SoarActionType =
  | 'ISOLATE_HOST_NETWORK'
  | 'TERMINATE_PROCESS_TREE'
  | 'REVOKE_CREDENTIALS'
  | 'SNAPSHOT_FORENSICS_MEMORY'
  | 'TRIGGER_DECOY_CANARY'
  | 'NOTIFY_CISO_CRITICAL';

export interface SoarPlaybookStep {
  readonly stepId: string;
  readonly action: SoarActionType;
  readonly description: string;
  readonly timeoutMs: number;
  readonly isCritical: boolean;
  readonly params: Record<string, unknown>;
}

export interface SoarPlaybookDefinition {
  readonly playbookId: string;
  readonly name: string;
  readonly targetTechnique: MitreTechniqueId;
  readonly minSeverity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly steps: readonly SoarPlaybookStep[];
  readonly autoApprove: boolean;
}

export interface StepExecutionResult {
  readonly stepId: string;
  readonly action: SoarActionType;
  readonly success: boolean;
  readonly durationMs: number;
  readonly output: string;
  readonly timestamp: string;
}

export interface PlaybookExecutionRecord {
  readonly executionId: string;
  readonly playbookId: string;
  readonly incidentId: string;
  readonly targetTechnique: MitreTechniqueId;
  readonly status: 'COMPLETED' | 'FAILED' | 'PARTIAL_ROLLBACK';
  readonly totalDurationMs: number;
  readonly withinSla: boolean; // Under DoD 30-second containment SLA
  readonly stepResults: readonly StepExecutionResult[];
  readonly quantumSignature: string;
  readonly timestamp: string;
}

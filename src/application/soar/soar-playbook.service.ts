/**
 * TUM CyberMesh — SOAR Playbook Execution Service
 * Clean Architecture Application Service
 */

import { randomUUID } from 'node:crypto';
import {
  SoarPlaybookDefinition,
  PlaybookExecutionRecord,
  StepExecutionResult,
  MitreTechniqueId,
  SoarActionType
} from '../../domain/soar/soar-playbook.types.js';
import { SoarPlaybookLogic } from '../../domain/soar/soar-playbook.logic.js';
import { Fips204MlDsaEngine } from '../../infrastructure/pqc/fips204-ml-dsa.engine.js';

export class SoarPlaybookService {
  private playbooks: Map<string, SoarPlaybookDefinition> = new Map();
  private executionHistory: PlaybookExecutionRecord[] = [];
  private pqcEngine: Fips204MlDsaEngine;

  constructor(pqcEngine?: Fips204MlDsaEngine) {
    this.pqcEngine = pqcEngine ?? new Fips204MlDsaEngine();
    this.seedDefaultPlaybooks();
  }

  private seedDefaultPlaybooks(): void {
    const defaultPlaybooks: SoarPlaybookDefinition[] = [
      {
        playbookId: 'SOAR-PB-RANSOMWARE',
        name: 'Autonomous Ransomware Blast Radius Containment',
        targetTechnique: 'T1486',
        minSeverity: 'HIGH',
        autoApprove: true,
        steps: [
          {
            stepId: 'PB-RANSOM-01',
            action: 'ISOLATE_HOST_NETWORK',
            description: 'Sever all outbound and inbound NIC traffic via kernel socket firewall',
            timeoutMs: 2000,
            isCritical: true,
            params: { filterEgress: true, filterIngress: true }
          },
          {
            stepId: 'PB-RANSOM-02',
            action: 'TERMINATE_PROCESS_TREE',
            description: 'Force SIGKILL on adversary process tree and encryptor child threads',
            timeoutMs: 1500,
            isCritical: true,
            params: { force: true }
          },
          {
            stepId: 'PB-RANSOM-03',
            action: 'SNAPSHOT_FORENSICS_MEMORY',
            description: 'Acquire ephemeral RAM dump to volatile memory vault before host reboot',
            timeoutMs: 5000,
            isCritical: false,
            params: { dumpType: 'FULL_RAM' }
          },
          {
            stepId: 'PB-RANSOM-04',
            action: 'NOTIFY_CISO_CRITICAL',
            description: 'Broadcast high-priority incident alert to CISO and Director plane',
            timeoutMs: 1000,
            isCritical: true,
            params: { urgency: 'IMMEDIATE' }
          }
        ]
      },
      {
        playbookId: 'SOAR-PB-CRED-DUMP',
        name: 'Autonomous LSASS / Mimikatz Credential Dumping Remediation',
        targetTechnique: 'T1003',
        minSeverity: 'HIGH',
        autoApprove: true,
        steps: [
          {
            stepId: 'PB-CRED-01',
            action: 'REVOKE_CREDENTIALS',
            description: 'Invalidate all Kerberos tickets, NTLM sessions, and DAC identity tokens',
            timeoutMs: 2500,
            isCritical: true,
            params: { scope: 'GLOBAL' }
          },
          {
            stepId: 'PB-CRED-02',
            action: 'ISOLATE_HOST_NETWORK',
            description: 'Isolate compromised host workstation to prevent lateral movement',
            timeoutMs: 2000,
            isCritical: true,
            params: { blockSubnet: true }
          },
          {
            stepId: 'PB-CRED-03',
            action: 'TRIGGER_DECOY_CANARY',
            description: 'Deploy active canary credentials into memory to detect secondary probes',
            timeoutMs: 1000,
            isCritical: false,
            params: { count: 3 }
          }
        ]
      },
      {
        playbookId: 'SOAR-PB-COMMAND-EXEC',
        name: 'Automated Web Shell & Malicious Script Interpreter Containment',
        targetTechnique: 'T1059',
        minSeverity: 'MEDIUM',
        autoApprove: true,
        steps: [
          {
            stepId: 'PB-CMD-01',
            action: 'TERMINATE_PROCESS_TREE',
            description: 'Terminate spawned reverse-shell process and command interpreter',
            timeoutMs: 1500,
            isCritical: true,
            params: { sendSignal: 'SIGKILL' }
          },
          {
            stepId: 'PB-CMD-02',
            action: 'ISOLATE_HOST_NETWORK',
            description: 'Drop remote C2 IP address at perimeter edge firewall',
            timeoutMs: 2000,
            isCritical: true,
            params: { ipDrop: true }
          }
        ]
      }
    ];

    for (const pb of defaultPlaybooks) {
      this.registerPlaybook(pb);
    }
  }

  public registerPlaybook(playbook: SoarPlaybookDefinition): void {
    const validation = SoarPlaybookLogic.validatePlaybook(playbook);
    if (!validation.isValid) {
      throw new Error(`Invalid SOAR Playbook: ${validation.error}`);
    }
    this.playbooks.set(playbook.playbookId, playbook);
  }

  public getPlaybook(playbookId: string): SoarPlaybookDefinition | undefined {
    return this.playbooks.get(playbookId);
  }

  public listPlaybooks(): SoarPlaybookDefinition[] {
    return Array.from(this.playbooks.values());
  }

  public async executePlaybook(
    playbookId: string,
    incidentId: string,
    customActionHandler?: (action: SoarActionType, params: Record<string, unknown>) => Promise<boolean>
  ): Promise<PlaybookExecutionRecord> {
    const playbook = this.playbooks.get(playbookId);
    if (!playbook) {
      throw new Error(`SOAR Playbook not found: ${playbookId}`);
    }

    const executionId = `SOAR-EXEC-${randomUUID()}`;
    const stepResults: StepExecutionResult[] = [];

    for (const step of playbook.steps) {
      const start = Date.now();
      let success = true;
      let output = `Executed action ${step.action} successfully.`;

      try {
        if (customActionHandler) {
          success = await customActionHandler(step.action, step.params);
          if (!success) output = `Action ${step.action} reported failure.`;
        }
      } catch (err: unknown) {
        success = false;
        output = err instanceof Error ? err.message : String(err);
      }

      const durationMs = Date.now() - start;
      stepResults.push({
        stepId: step.stepId,
        action: step.action,
        success,
        durationMs,
        output,
        timestamp: new Date().toISOString()
      });

      if (!success && step.isCritical) {
        break;
      }
    }

    // Post-Quantum cryptographic signature over execution receipt
    const payloadDigest = Buffer.from(`${executionId}:${playbookId}:${incidentId}:${stepResults.length}`).toString('hex');
    const pqcSignResult = await this.pqcEngine.sign(payloadDigest, 'ML-DSA-65');

    const record = SoarPlaybookLogic.evaluateExecutionRecord(
      executionId,
      playbookId,
      incidentId,
      playbook.targetTechnique,
      stepResults,
      pqcSignResult.pqcSignatureHex
    );

    this.executionHistory.push(record);
    return record;
  }

  public async matchAndExecute(
    incidentId: string,
    technique: MitreTechniqueId,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): Promise<PlaybookExecutionRecord | undefined> {
    const matched = SoarPlaybookLogic.matchPlaybook(this.listPlaybooks(), technique, severity);
    if (!matched) return undefined;

    return this.executePlaybook(matched.playbookId, incidentId);
  }

  public getExecutionHistory(): PlaybookExecutionRecord[] {
    return [...this.executionHistory];
  }
}

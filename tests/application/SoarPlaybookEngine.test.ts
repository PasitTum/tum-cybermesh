import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SoarPlaybookService } from '../../src/application/soar/soar-playbook.service.js';
import { SoarPlaybookLogic } from '../../src/domain/soar/soar-playbook.logic.js';
import { SoarPlaybookDefinition } from '../../src/domain/soar/soar-playbook.types.js';

describe('SOAR Playbook Execution Engine (MESH-SOAR-01)', () => {
  it('initializes with default enterprise playbooks for Ransomware, Credential Dumping, and Command Exec', () => {
    const service = new SoarPlaybookService();
    const playbooks = service.listPlaybooks();

    assert.ok(playbooks.length >= 3, 'Should have at least 3 default enterprise playbooks');
    const techniques = playbooks.map(p => p.targetTechnique);
    assert.ok(techniques.includes('T1486'), 'Ransomware playbook should exist');
    assert.ok(techniques.includes('T1003'), 'Credential dumping playbook should exist');
    assert.ok(techniques.includes('T1059'), 'Command execution playbook should exist');
  });

  it('validates playbook constraints and rejects invalid step timeouts', () => {
    const invalidPlaybook: SoarPlaybookDefinition = {
      playbookId: 'INVALID-PB',
      name: 'Exceeding SLA Playbook',
      targetTechnique: 'T1486',
      minSeverity: 'HIGH',
      autoApprove: true,
      steps: [
        {
          stepId: 'STEP-1',
          action: 'ISOLATE_HOST_NETWORK',
          description: 'Too long step',
          timeoutMs: 45000, // exceeds 30s SLA limit
          isCritical: true,
          params: {}
        }
      ]
    };

    const validation = SoarPlaybookLogic.validatePlaybook(invalidPlaybook);
    assert.strictEqual(validation.isValid, false);
    assert.ok(validation.error?.includes('exceeds 30s SLA limit'));
  });

  it('executes Ransomware playbook successfully and verifies PQC signature & SLA compliance', async () => {
    const service = new SoarPlaybookService();
    const execution = await service.executePlaybook('SOAR-PB-RANSOMWARE', 'INC-9901');

    assert.strictEqual(execution.status, 'COMPLETED');
    assert.strictEqual(execution.playbookId, 'SOAR-PB-RANSOMWARE');
    assert.strictEqual(execution.incidentId, 'INC-9901');
    assert.strictEqual(execution.targetTechnique, 'T1486');
    assert.strictEqual(execution.withinSla, true);
    assert.strictEqual(execution.stepResults.length, 4);
    assert.ok(execution.quantumSignature.length > 32, 'Must include ML-DSA-65 post-quantum signature');
  });

  it('automatically matches and executes playbook for MITRE ATT&CK technique T1003', async () => {
    const service = new SoarPlaybookService();
    const result = await service.matchAndExecute('INC-9902', 'T1003', 'HIGH');

    assert.ok(result);
    assert.strictEqual(result.playbookId, 'SOAR-PB-CRED-DUMP');
    assert.strictEqual(result.status, 'COMPLETED');
    assert.strictEqual(result.stepResults.length, 3);
  });

  it('halts execution on critical step failure and marks status as FAILED', async () => {
    const service = new SoarPlaybookService();
    const execution = await service.executePlaybook(
      'SOAR-PB-COMMAND-EXEC',
      'INC-9903',
      async (action) => {
        if (action === 'TERMINATE_PROCESS_TREE') {
          throw new Error('Access denied by kernel hook');
        }
        return true;
      }
    );

    assert.strictEqual(execution.status, 'FAILED');
    assert.strictEqual(execution.stepResults[0].success, false);
    // Should stop because step 1 was critical
    assert.strictEqual(execution.stepResults.length, 1);
  });
});

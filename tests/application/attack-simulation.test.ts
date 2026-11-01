import test from 'node:test';
import assert from 'node:assert/strict';
import { AttackSimulationEngine } from '../../src/application/simulation/attack-simulation.service.js';
import { CorrelationEngineService } from '../../src/application/correlation/correlation-engine.service.js';
import { PartitionedRingBuffer } from '../../src/infrastructure/lakehouse/partitioned-ring-buffer.js';
import { AutonomousTriageUseCase } from '../../src/application/analyst/use-cases/autonomous-triage.use-case.js';
import { AutonomousContainmentUseCase } from '../../src/application/analyst/use-cases/autonomous-containment.use-case.js';
import { InMemoryContainmentExecutor } from '../../src/infrastructure/containment/in-memory-containment-executor.js';
import { SocAnalystFleetService } from '../../src/application/analyst/services/soc-analyst-fleet.service.js';
import { Fips204MlDsaEngine } from '../../src/infrastructure/pqc/fips204-ml-dsa.engine.js';
import { TelemetryEvent } from '../../src/domain/telemetry/entities/telemetry-event.entity.js';
import { SigmaRuleDefinition } from '../../src/domain/sigma/sigma-rule.types.js';

test('AttackSimulationEngine: Runs Ransomware breach simulation and verifies automated defense response', async () => {
  const lakehouse = new PartitionedRingBuffer<TelemetryEvent>(100);
  const containmentExecutor = new InMemoryContainmentExecutor();
  const triageUseCase = new AutonomousTriageUseCase();
  const containmentUseCase = new AutonomousContainmentUseCase(containmentExecutor);
  const socFleet = new SocAnalystFleetService(triageUseCase, containmentUseCase);
  const pqcEngine = new Fips204MlDsaEngine();

  const correlationEngine = new CorrelationEngineService(lakehouse, socFleet, pqcEngine);
  const simEngine = new AttackSimulationEngine(pqcEngine);

  // Register Sigma Rule for Shadow Copy deletion
  const vssRule: SigmaRuleDefinition = {
    id: 'sigma-vssadmin-shadow-delete',
    title: 'Shadow Copies Deletion via VSSAdmin',
    status: 'stable',
    description: 'Detects shadow copy deletion often used by ransomware prior to encryption',
    logsource: { category: 'process_creation' },
    level: 'critical',
    tags: ['attack.impact', 'attack.t1490'],
    detection: {
      selection: {
        action: 'shadow_copy_delete'
      },
      condition: 'selection'
    }
  };
  correlationEngine.registerRule(vssRule);

  const report = await simEngine.executeCampaign(
    'RANSOMWARE',
    'prod-sql-server-01',
    'tenant-corp-sec',
    correlationEngine
  );

  assert.equal(report.campaignType, 'RANSOMWARE');
  assert.equal(report.totalSteps, 3);
  assert.ok(report.detectedSteps >= 1);
  assert.ok(report.containedSteps >= 1);
  assert.ok(report.defenseEffectivenessScore > 0);
  assert.ok(report.pqcAttestationDigest.length > 32);

  // Step 2 should be flagged and contained
  const step2 = report.stepResults.find(s => s.stepNo === 2);
  assert.equal(step2?.detected, true);
  assert.equal(step2?.contained, true);
  assert.deepEqual(step2?.rulesMatched, ['sigma-vssadmin-shadow-delete']);
});

test('AttackSimulationEngine: Runs Credential Theft simulation and verifies containment', async () => {
  const lakehouse = new PartitionedRingBuffer<TelemetryEvent>(100);
  const containmentExecutor = new InMemoryContainmentExecutor();
  const triageUseCase = new AutonomousTriageUseCase();
  const containmentUseCase = new AutonomousContainmentUseCase(containmentExecutor);
  const socFleet = new SocAnalystFleetService(triageUseCase, containmentUseCase);
  const pqcEngine = new Fips204MlDsaEngine();

  const correlationEngine = new CorrelationEngineService(lakehouse, socFleet, pqcEngine);
  const simEngine = new AttackSimulationEngine(pqcEngine);

  // Register Sigma Rule for LSASS dump
  const lsassRule: SigmaRuleDefinition = {
    id: 'sigma-lsass-dump-detection',
    title: 'LSASS Memory Dump Execution',
    status: 'stable',
    description: 'Detects procdump targeting LSASS process',
    logsource: { category: 'process_creation' },
    level: 'critical',
    tags: ['attack.credential_access', 'attack.t1003.001'],
    detection: {
      selection: {
        action: 'credential_dump'
      },
      condition: 'selection'
    }
  };
  correlationEngine.registerRule(lsassRule);

  const report = await simEngine.executeCampaign(
    'CREDENTIAL_THEFT',
    'dc-primary-01',
    'tenant-corp-sec',
    correlationEngine
  );

  assert.equal(report.campaignType, 'CREDENTIAL_THEFT');
  assert.equal(report.totalSteps, 2);
  assert.ok(report.detectedSteps >= 1);
  assert.ok(report.containedSteps >= 1);

  const step2 = report.stepResults.find(s => s.stepNo === 2);
  assert.equal(step2?.detected, true);
  assert.equal(step2?.contained, true);
});

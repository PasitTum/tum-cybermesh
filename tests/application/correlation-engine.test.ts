import test from 'node:test';
import assert from 'node:assert/strict';
import { CorrelationEngineService } from '../../src/application/correlation/correlation-engine.service.js';
import { PartitionedRingBuffer } from '../../src/infrastructure/lakehouse/partitioned-ring-buffer.js';
import { AutonomousTriageUseCase } from '../../src/application/analyst/use-cases/autonomous-triage.use-case.js';
import { AutonomousContainmentUseCase } from '../../src/application/analyst/use-cases/autonomous-containment.use-case.js';
import { InMemoryContainmentExecutor } from '../../src/infrastructure/containment/in-memory-containment-executor.js';
import { SocAnalystFleetService } from '../../src/application/analyst/services/soc-analyst-fleet.service.js';
import { Fips204MlDsaEngine } from '../../src/infrastructure/pqc/fips204-ml-dsa.engine.js';
import { TelemetryEvent } from '../../src/domain/telemetry/entities/telemetry-event.entity.js';
import { SigmaRuleDefinition } from '../../src/domain/sigma/sigma-rule.types.js';

test('CorrelationEngineService: Benign events pass without triggering containment', async () => {
  const lakehouse = new PartitionedRingBuffer<TelemetryEvent>(100);
  const containmentExecutor = new InMemoryContainmentExecutor();
  const triageUseCase = new AutonomousTriageUseCase();
  const containmentUseCase = new AutonomousContainmentUseCase(containmentExecutor);
  const socFleet = new SocAnalystFleetService(triageUseCase, containmentUseCase);
  const pqcEngine = new Fips204MlDsaEngine();

  const service = new CorrelationEngineService(lakehouse, socFleet, pqcEngine);

  const rule: SigmaRuleDefinition = {
    id: 'sigma-mimikatz-lsass',
    title: 'LSASS Memory Dumping Detected',
    status: 'stable',
    description: 'Detects attempts to dump LSASS process memory',
    logsource: { category: 'process_creation' },
    level: 'critical',
    tags: ['attack.credential_access', 'attack.t1003.001'],
    detection: {
      selection: {
        action: 'lsass_dump'
      },
      condition: 'selection'
    }
  };
  service.registerRule(rule);

  const benignEvent = new TelemetryEvent({
    id: 'evt-benign-001',
    tenantId: 'tenant-alpha',
    category: 'PROCESS',
    severity: 'INFORMATIONAL',
    timestamp: new Date().toISOString(),
    sourceHost: 'prod-workstation-01',
    action: 'process_spawn',
    metadata: { commandLine: 'git status' }
  });

  const result = await service.processEvent(benignEvent);

  assert.equal(result.matchedRules.length, 0);
  assert.equal(result.requiresContainment, false);
  assert.equal(result.triageResponse, undefined);
  assert.equal(result.pqcSignatureEnvelope, undefined);
  assert.equal(lakehouse.size(), 1);
});

test('CorrelationEngineService: Detects critical attack, auto-contains and signs with PQC ML-DSA-65', async () => {
  const lakehouse = new PartitionedRingBuffer<TelemetryEvent>(100);
  const containmentExecutor = new InMemoryContainmentExecutor();
  const triageUseCase = new AutonomousTriageUseCase();
  const containmentUseCase = new AutonomousContainmentUseCase(containmentExecutor);
  const socFleet = new SocAnalystFleetService(triageUseCase, containmentUseCase);
  const pqcEngine = new Fips204MlDsaEngine();

  const service = new CorrelationEngineService(lakehouse, socFleet, pqcEngine);

  const rule: SigmaRuleDefinition = {
    id: 'sigma-lsass-dump',
    title: 'LSASS Process Memory Dump',
    status: 'stable',
    description: 'Detects LSASS process memory dump attacks',
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
  service.registerRule(rule);

  const maliciousEvent = new TelemetryEvent({
    id: 'evt-attack-999',
    tenantId: 'tenant-alpha',
    category: 'PROCESS',
    severity: 'CRITICAL',
    timestamp: new Date().toISOString(),
    sourceHost: 'domain-controller-01',
    action: 'credential_dump',
    metadata: {
      tool: 'mimikatz.exe',
      targetPid: 664,
      commandLine: 'sekurlsa::logonpasswords'
    }
  });

  const result = await service.processEvent(maliciousEvent);

  // 1. Sigma Match Assertions
  assert.equal(result.matchedRules.length, 1);
  assert.equal(result.matchedRules[0].ruleId, 'sigma-lsass-dump');
  assert.deepEqual(result.mitreTechniques, ['attack.credential_access', 'attack.t1003.001']);

  // 2. Autonomous Triage & Containment Assertions
  assert.ok(result.triageResponse);
  assert.equal(result.triageResponse.tier1Decision.verdict, 'MALICIOUS_CONTAINMENT_REQUIRED');
  assert.equal(result.requiresContainment, true);
  assert.ok(result.triageResponse.containmentActions.length > 0);

  // 3. Post-Quantum Cryptographic Envelope Assertions
  assert.ok(result.pqcSignatureEnvelope);
  assert.equal(result.pqcSignatureEnvelope.algorithm, 'ML-DSA-65');
  assert.ok(result.pqcSignatureEnvelope.signatureHex.length > 100);
  assert.ok(result.pqcSignatureEnvelope.publicKeyHex.length > 100);

  // 4. Verify PQC Signature integrity
  const verified = await pqcEngine.verify(
    result.pqcSignatureEnvelope.digestHex,
    result.pqcSignatureEnvelope.signatureHex,
    result.pqcSignatureEnvelope.publicKeyHex,
    'ML-DSA-65'
  );
  assert.equal(verified, true);
});

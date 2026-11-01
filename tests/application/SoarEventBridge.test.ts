import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SoarEventBridgeService } from '../../src/application/soar/soar-event-bridge.service.js';
import { PlaybookExecutionRecord } from '../../src/domain/soar/soar-playbook.types.js';

describe('SoarEventBridgeService (MESH-BRIDGE-01)', () => {
  it('creates well-formed cross-fleet dispatch event conforming to Sovereign Event Mesh standard', () => {
    const bridge = new SoarEventBridgeService();

    const mockRecord: PlaybookExecutionRecord = {
      executionId: 'EXEC-TEST-001',
      playbookId: 'SOAR-PB-RANSOMWARE',
      incidentId: 'INC-RANSOM-44',
      targetTechnique: 'T1486',
      status: 'COMPLETED',
      totalDurationMs: 4500,
      withinSla: true,
      stepResults: [],
      quantumSignature: 'sig_fips204_lattice_sample_hex',
      timestamp: new Date().toISOString()
    };

    const fleetEvent = bridge.createFleetEvent(mockRecord);

    assert.strictEqual(fleetEvent.topic, 'CYBERMESH_SOAR_CONTAINMENT');
    assert.strictEqual(fleetEvent.sourceRepo, 'tum-cybermesh');
    assert.strictEqual(fleetEvent.payload.executionId, 'EXEC-TEST-001');
    assert.strictEqual(fleetEvent.payload.technique, 'T1486');
    assert.strictEqual(fleetEvent.payload.withinSla, true);
    assert.strictEqual(bridge.getDispatchedEvents().length, 1);
  });
});

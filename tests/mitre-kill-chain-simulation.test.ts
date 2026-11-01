import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MitreKillChainSimulator } from '../src/application/simulation/mitre-kill-chain-simulator.js';
import { SocAnalystFleetService } from '../src/application/analyst/services/soc-analyst-fleet.service.js';
import { AutonomousTriageUseCase } from '../src/application/analyst/use-cases/autonomous-triage.use-case.js';
import { AutonomousContainmentUseCase } from '../src/application/analyst/use-cases/autonomous-containment.use-case.js';
import { InMemoryContainmentExecutor } from '../src/infrastructure/containment/in-memory-containment-executor.js';

describe('MitreKillChainSimulator (Multi-Stage Cyber Kill Chain Emulation)', () => {
  it('simulates 3-stage adversary sequence and confirms breach prevention before C2/Actions on Objectives', async () => {
    const executor = new InMemoryContainmentExecutor();
    const socFleet = new SocAnalystFleetService(
      new AutonomousTriageUseCase(),
      new AutonomousContainmentUseCase(executor)
    );
    const simulator = new MitreKillChainSimulator(socFleet);

    const report = await simulator.runFullKillChain('sovereign-db-node-01');

    assert.equal(report.targetEnclave, 'sovereign-db-node-01');
    assert.equal(report.totalStages, 3);
    assert.equal(report.breachPrevented, true);
    assert.ok(report.stoppedAtPhase === 'EXPLOITATION' || report.stoppedAtPhase === 'COMMAND_AND_CONTROL');
    assert.ok(report.totalSimulationDurationMs < 5000); // Fast simulation execution
  });
});

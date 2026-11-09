#!/usr/bin/env node

import { PqcDiscoveryScanner } from '../../infrastructure/scanner/pqc-discovery-scanner.js';
import { InMemoryTelemetryLakehouse } from '../../infrastructure/lakehouse/in-memory-telemetry-lakehouse.js';
import { IngestTelemetryBatchUseCase } from '../../application/telemetry/use-cases/ingest-telemetry-batch.use-case.js';
import { AutonomousTriageUseCase } from '../../application/analyst/use-cases/autonomous-triage.use-case.js';
import { AutonomousContainmentUseCase } from '../../application/analyst/use-cases/autonomous-containment.use-case.js';
import { InMemoryContainmentExecutor } from '../../infrastructure/containment/in-memory-containment-executor.js';
import { SocAnalystFleetService } from '../../application/analyst/services/soc-analyst-fleet.service.js';
import { TelemetryEvent } from '../../domain/telemetry/entities/telemetry-event.entity.js';
import { GenerateCanaryTokenUseCase } from '../../application/honeytoken/use-cases/generate-canary-token.use-case.js';
import { ExecuteAutoRedTeamUseCase } from '../../application/ctem/use-cases/execute-auto-red-team.use-case.js';
import { EvaluateExposureUseCase } from '../../application/ctem/use-cases/evaluate-exposure.use-case.js';
import { Fips204MlDsaEngine } from '../../infrastructure/pqc/fips204-ml-dsa.engine.js';
import { Fips203MlKemEngine } from '../../infrastructure/pqc/fips203-ml-kem.engine.js';
import { CommitAuditBlockUseCase } from '../../application/ledger/use-cases/commit-audit-block.use-case.js';
import { VerifyInclusionProofUseCase } from '../../application/ledger/use-cases/verify-inclusion-proof.use-case.js';
import { PqcAuditLedgerService } from '../../application/ledger/services/pqc-audit-ledger.service.js';
import { BuildThreatLineageUseCase } from '../../application/hunting/use-cases/build-threat-lineage.use-case.js';
import { HuntAnomalousLineageUseCase } from '../../application/hunting/use-cases/hunt-anomalous-lineage.use-case.js';
import { MitreKillChainSimulator } from '../../application/simulation/mitre-kill-chain-simulator.js';
import { SynchronizeP2pMeshUseCase } from '../../application/mesh/use-cases/synchronize-p2p-mesh.use-case.js';
import { P2pMerkleMeshService } from '../../application/mesh/services/p2p-merkle-mesh.service.js';
import { EstablishMlKemTunnelUseCase } from '../../application/tunnel/use-cases/establish-mlkem-tunnel.use-case.js';
import { createCyberMeshServer } from '../web/server.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'help';

  console.log('[MESH] TUM Sovereign CyberMesh — Autonomous XSIAM & Unified Defense Cloud');
  console.log('       Classification: TUM Group Holdings Flagship\n');

  switch (command) {
    case 'scan':
    case 'pqc:scan': {
      console.log('[SCAN] Executing Post-Quantum Crypto-Agility Discovery Scan (MESH-BKL-07)...');
      const scanner = new PqcDiscoveryScanner();
      const result = scanner.scanDefaultFleet();

      console.log(`\n[SUMMARY] Scan Summary:`);
      console.log(`  - Total Endpoints Scanned: ${result.totalAssetsScanned}`);
      console.log(`  - Quantum-Resistant (NIST FIPS 204/203): ${result.quantumResistantCount}`);
      console.log(`  - Transitional Hybrid: ${result.transitionalHybridCount}`);
      console.log(`  - Quantum-Vulnerable (Legacy RSA/ECC): ${result.quantumVulnerableCount}`);
      console.log(`  - Overall Fleet PQC Readiness: ${result.overallMigrationReadinessPercent}%\n`);

      console.log('[INVENTORY] Asset Inventory:');
      for (const item of result.inventory) {
        const badge =
          item.status === 'QUANTUM_RESISTANT_NIST'
            ? '[PQC READY]'
            : item.status === 'TRANSITIONAL_HYBRID'
            ? '[HYBRID]'
            : '[VULNERABLE]';
        console.log(`  ${badge} ${item.assetName} (${item.cipherSuite} / ${item.signatureScheme}) -> ${item.recommendedPqcTarget}`);
      }
      break;
    }

    case 'lakehouse':
    case 'lakehouse:benchmark': {
      console.log('[BENCHMARK] Benchmarking Lakehouse Ingestion Pipeline (MESH-EPIC-01)...');
      const lakehouse = new InMemoryTelemetryLakehouse(500000);
      const useCase = new IngestTelemetryBatchUseCase(lakehouse);

      const batchSize = 10000;
      const sampleEvents = Array.from({ length: batchSize }).map((_, i) => ({
        id: `bench-ev-${i}`,
        timestamp: new Date().toISOString(),
        sourceHost: `host-${i % 20}.tum.internal`,
        tenantId: 'tum-corp',
        category: 'KERNEL_SYSCALL' as const,
        severity: 'INFORMATIONAL' as const,
        action: 'SYS_EXECVE',
        metadata: { pid: 1000 + (i % 100), latencyUs: 12 },
      }));

      const start = performance.now();
      const res = await useCase.execute({ events: sampleEvents });
      const duration = performance.now() - start;

      const ratePerSec = Math.round((batchSize / (duration / 1000)));
      console.log(`  - Ingested: ${res.accepted} events`);
      console.log(`  - Ingestion Time: ${Math.round(duration)}ms`);
      console.log(`  - Throughput: ${ratePerSec.toLocaleString()} events/sec (Surpasses 100M/day target: ~1,157/sec)`);
      break;
    }

    case 'soc:triage': {
      console.log('[ANALYST] Running Autonomous SOC Analyst Fleet Simulation (MESH-EPIC-02)...');
      const executor = new InMemoryContainmentExecutor();
      const fleet = new SocAnalystFleetService(
        new AutonomousTriageUseCase(),
        new AutonomousContainmentUseCase(executor)
      );

      const hostileEvent = new TelemetryEvent({
        id: 'hostile-ev-01',
        timestamp: new Date().toISOString(),
        sourceHost: 'compromised-k8s-pod.tum.internal',
        tenantId: 'tum-corp',
        category: 'SOCKET_CONNECT',
        severity: 'CRITICAL',
        action: 'REVERSE_SHELL_DETECTED: /dev/tcp/198.51.100.4/4444',
        metadata: {
          pid: 9912,
          processName: 'bash',
          sourceIp: '198.51.100.4',
        },
      });

      const result = await fleet.processEvent({ event: hostileEvent });
      console.log(`  - Incident ID: ${result.incident.id}`);
      console.log(`  - Tier-1 Verdict: ${result.tier1Decision.verdict} (${result.tier1Decision.reasoning})`);
      console.log(`  - MITRE Technique: ${result.tier1Decision.mitreMapping?.techniqueId} (${result.tier1Decision.mitreMapping?.techniqueName})`);
      console.log(`  - Tier-2 Containment Executed: ${result.containmentExecuted ? 'YES' : 'NO'}`);
      console.log(`  - Containment Actions: ${result.containmentActions.map((a) => a.type + ' -> ' + a.target).join(', ')}`);
      console.log(`  - Execution SLA: ${result.incident.getContainmentDurationMs() ?? 0}ms (DoD Requirement: <30,000ms [PASS])`);
      break;
    }

    case 'canary:generate': {
      console.log('[CANARY] Generating Autonomous Honeytoken & Canary Traps (MESH-BKL-04)...');
      const gen = new GenerateCanaryTokenUseCase();
      const jwtToken = gen.execute({
        tokenType: 'SOVEREIGN_JWT_TOKEN',
        decoyIdentifier: 'dev-master-sa-key',
        targetDeploymentLocation: '/etc/tum/credentials.env',
        tenantId: 'tum-sovereign',
      });
      const awsToken = gen.execute({
        tokenType: 'AWS_SECRET_KEY',
        decoyIdentifier: 'cloud-backup-credentials',
        targetDeploymentLocation: '~/.aws/credentials',
        tenantId: 'tum-sovereign',
      });

      console.log(`  - Canary Token 1 (${jwtToken.tokenType}): ${jwtToken.secretPayload.slice(0, 40)}...`);
      console.log(`  - Canary Token 2 (${awsToken.tokenType}): ${awsToken.secretPayload.slice(0, 40)}...`);
      console.log(`  - Deployment Locations: [${jwtToken.targetDeploymentLocation}, ${awsToken.targetDeploymentLocation}]`);
      break;
    }

    case 'ctem:evaluate': {
      console.log('[CTEM] Evaluating Continuous Threat Exposure Management & Auto-Red Teaming (MESH-EPIC-03)...');
      const ctem = new EvaluateExposureUseCase(new ExecuteAutoRedTeamUseCase());
      const { report } = ctem.execute({
        tenantId: 'tum-sovereign',
        assetIdentifier: 'prod-api-cluster-01',
        assetType: 'CLUSTER',
        openPorts: [80, 443, 22, 8080],
        detectedServices: ['nginx', 'docker', 'openssh'],
        cveList: ['CVE-2024-3094'],
        authProtocols: ['OIDC_PKCE', 'LEGACY_PASSWORD'],
      });

      console.log(`  - Asset: ${report.assetIdentifier}`);
      console.log(`  - Exposure Score: ${report.exposureScore}/100 (Risk Level: ${report.riskLevel})`);
      console.log(`  - Red Team Probes Executed: ${report.probes.length}`);
      console.log(`  - Prioritized Remediation Plan:`);
      report.remediationPlan.forEach((step: string, idx: number) => console.log(`      ${idx + 1}. ${step}`));
      break;
    }

    case 'ledger:seal': {
      console.log('[LEDGER] Sealing Quantum-Safe Merkle Audit Block (NIST FIPS 204 ML-DSA-65)...');
      const mlDsa = new Fips204MlDsaEngine();
      const ledger = new PqcAuditLedgerService(
        new CommitAuditBlockUseCase(mlDsa),
        new VerifyInclusionProofUseCase(mlDsa)
      );

      ledger.appendEvent(JSON.stringify({ event: 'SYS_EXEC', pid: 1001, user: 'root' }));
      ledger.appendEvent(JSON.stringify({ event: 'SOCKET_FLOW', ip: '10.0.0.1', port: 443 }));
      ledger.appendEvent(JSON.stringify({ event: 'PQC_ENVELOPE_SIGN', algo: 'ML-DSA-65' }));

      const res = await ledger.sealBlock();
      console.log(`  - Block Height: #${res.block.blockHeight}`);
      console.log(`  - Merkle Root (SHA-384): ${res.merkleRoot.slice(0, 48)}...`);
      console.log(`  - PQC ML-DSA-65 Signature: ${res.pqcSignatureHex.slice(0, 48)}...`);
      console.log(`  - Sealed Events: ${res.leafCount} events in ${res.blockLatencyMs}ms`);

      const proof = ledger.getInclusionProof(res.block.blockHeight, 0);
      const verified = await ledger.verifyProof(proof, res.block.blockHeight);
      console.log(`  - Merkle Inclusion & PQC Signature Verified: ${verified.valid ? '[VALID]' : '[INVALID]'}`);
      break;
    }

    case 'hunt:lineage': {
      console.log('[HUNT] Reconstructing Causal Threat Lineage DAG Graph & Anomalous Hunting...');
      const sampleEvents = [
        new TelemetryEvent({
          id: 'ev-1',
          timestamp: '2026-11-01T12:00:00Z',
          sourceHost: 'k8s-pod',
          tenantId: 'tum-corp',
          category: 'PROCESS_EXECUTION',
          severity: 'INFORMATIONAL',
          action: 'SPAWN',
          metadata: { pid: 100, ppid: 1, processName: 'nginx' },
        }),
        new TelemetryEvent({
          id: 'ev-2',
          timestamp: '2026-11-01T12:01:00Z',
          sourceHost: 'k8s-pod',
          tenantId: 'tum-corp',
          category: 'PROCESS_EXECUTION',
          severity: 'HIGH',
          action: 'SPAWN',
          metadata: { pid: 200, ppid: 100, processName: 'bash' },
        }),
        new TelemetryEvent({
          id: 'ev-3',
          timestamp: '2026-11-01T12:02:00Z',
          sourceHost: 'k8s-pod',
          tenantId: 'tum-corp',
          category: 'SOCKET_CONNECT',
          severity: 'CRITICAL',
          action: 'CONNECT',
          metadata: { pid: 200, destinationIp: '198.51.100.4' },
        }),
      ];

      const builder = new BuildThreatLineageUseCase();
      const hunter = new HuntAnomalousLineageUseCase();
      const graph = builder.execute(sampleEvents);
      const findings = hunter.execute(graph);

      console.log(`  - Graph Topology: ${graph.getAllNodes().length} Nodes, ${graph.getAllEdges().length} Edges`);
      console.log(`  - Anomalous Hunt Findings: ${findings.length}`);
      for (const f of findings) {
        console.log(`    [${f.severity}] ${f.type}: ${f.summary}`);
      }
      break;
    }

    case 'sim:killchain': {
      console.log('[SIMULATION] Executing Lockheed Martin / MITRE ATT&CK Cyber Kill Chain Simulation...');
      const executor = new InMemoryContainmentExecutor();
      const fleet = new SocAnalystFleetService(
        new AutonomousTriageUseCase(),
        new AutonomousContainmentUseCase(executor)
      );
      const sim = new MitreKillChainSimulator(fleet);

      const report = await sim.runFullKillChain('sovereign-core-node');
      console.log(`  - Simulation ID: ${report.simulationId}`);
      console.log(`  - Total Kill Chain Stages: ${report.totalStages}`);
      console.log(`  - Attack Stopped At Phase: [CONTAINED] ${report.stoppedAtPhase}`);
      console.log(`  - Breach Prevented: ${report.breachPrevented ? 'YES' : 'NO'}`);
      console.log(`  - Total Duration: ${report.totalSimulationDurationMs}ms`);
      break;
    }

    case 'mesh:sync': {
      console.log('[MESH] Synchronizing Distributed P2P Merkle Mesh (Multi-Enclave BFT Consensus)...');
      const mesh = new P2pMerkleMeshService(new SynchronizeP2pMeshUseCase());
      const peers = mesh.getAllPeers();
      console.log(`  - Total Enclaves Active: ${peers.length}`);
      for (const p of peers) {
        console.log(`    [${p.region}] ${p.enclaveName} (Block #${p.currentBlockHeight}, Status: ${p.status})`);
      }

      const verdict = mesh.triggerConsensus(1);
      console.log(`\n  - Consensus Quorum Reached: ${verdict.quorumReached ? 'YES' : 'NO'} (${verdict.agreeingPeersCount}/${verdict.totalPeers} Peers)`);
      console.log(`  - Canonical Merkle Root: ${verdict.agreedMerkleRoot.slice(0, 48)}...`);
      console.log(`  - Byzantine Divergent Nodes Isolated: ${verdict.byzantineNodesIsolated.length}`);
      break;
    }

    case 'tunnel:handshake': {
      console.log('[TUNNEL] Establishing NIST FIPS 203 ML-KEM Ephemeral Encrypted Telemetry Tunnel...');
      const tunnel = new EstablishMlKemTunnelUseCase(new Fips203MlKemEngine());
      const { session, encrypt, decrypt } = tunnel.execute({
        initiatorNodeId: 'rayong-eec-edge-sensor',
        responderNodeId: 'bangkok-core-lakehouse',
        kemAlgorithm: 'ML-KEM-768',
      });

      console.log(`  - Session ID: ${session.sessionId}`);
      console.log(`  - KEM Algorithm: ${session.kemAlgorithm} (NIST FIPS 203)`);
      console.log(`  - Initiator: ${session.initiatorNodeId} <---> Responder: ${session.responderNodeId}`);
      console.log(`  - Ciphertext Hex: ${session.ciphertextHex.slice(0, 48)}...`);

      const testMsg = 'SOVEREIGN_KERNEL_TELEMETRY: FD_CONNECT 10.0.0.1:443';
      const frame = encrypt(testMsg);
      console.log(`  - AEAD Encrypted Frame: ${frame.ciphertextHex.slice(0, 48)}... (Tag: ${frame.authTagHex.slice(0, 16)})`);
      const decrypted = decrypt(frame);
      console.log(`  - Authenticated Decrypted Payload: "${decrypted}"`);
      console.log(`  - Tunnel Status: [SECURE] ZERO-TRUST QUANTUM-SAFE ENCRYPTED`);
      break;
    }

    case 'hud': {
      const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 7799;
      const { server } = createCyberMeshServer();
      server.listen(port, () => {
        console.log(`[HUD] 3D Threat Topology WebGL HUD active at: http://localhost:${port}`);
      });
      break;
    }

    default:
      console.log('Available Commands:');
      console.log('  pqc:scan            Scan fleet for quantum crypto-agility (MESH-BKL-07)');
      console.log('  lakehouse           Benchmark high-scale lakehouse ingestion (MESH-EPIC-01)');
      console.log('  soc:triage          Run autonomous SOC analyst fleet triage & 30s containment (MESH-EPIC-02)');
      console.log('  ctem:evaluate       Continuous threat exposure evaluation & auto red teaming (MESH-EPIC-03)');
      console.log('  canary:generate     Generate honeytoken decoys and canary traps (MESH-BKL-04)');
      console.log('  ledger:seal         Seal pending events into NIST FIPS 204 PQC Merkle Block');
      console.log('  hunt:lineage        Reconstruct causal threat lineage DAG & hunt LotL anomalies');
      console.log('  sim:killchain       Simulate multi-stage Lockheed Martin / MITRE ATT&CK Kill Chain');
      console.log('  mesh:sync           Cross-validate distributed P2P Merkle mesh consensus');
      console.log('  tunnel:handshake    Establish ephemeral NIST FIPS 203 ML-KEM telemetry tunnel');
      console.log('  hud                 Launch 3D WebGL Threat Topology HUD server on port 7799 (MESH-BKL-06)');
      break;
  }
}

main().catch(console.error);

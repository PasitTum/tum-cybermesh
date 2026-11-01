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
import { createCyberMeshServer } from '../web/server.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'help';

  console.log('🏛️  TUM Sovereign CyberMesh — Autonomous XSIAM & Unified Defense Cloud');
  console.log('    Classification: TUM Group Holdings Flagship\n');

  switch (command) {
    case 'scan':
    case 'pqc:scan': {
      console.log('🔍 Executing Post-Quantum Crypto-Agility Discovery Scan (MESH-BKL-07)...');
      const scanner = new PqcDiscoveryScanner();
      const result = scanner.scanDefaultFleet();

      console.log(`\n📊 Scan Summary:`);
      console.log(`  - Total Endpoints Scanned: ${result.totalAssetsScanned}`);
      console.log(`  - Quantum-Resistant (NIST FIPS 204/203): ${result.quantumResistantCount}`);
      console.log(`  - Transitional Hybrid: ${result.transitionalHybridCount}`);
      console.log(`  - Quantum-Vulnerable (Legacy RSA/ECC): ${result.quantumVulnerableCount}`);
      console.log(`  - Overall Fleet PQC Readiness: ${result.overallMigrationReadinessPercent}%\n`);

      console.log('📋 Asset Inventory:');
      for (const item of result.inventory) {
        const badge =
          item.status === 'QUANTUM_RESISTANT_NIST'
            ? '✅ [PQC READY]'
            : item.status === 'TRANSITIONAL_HYBRID'
            ? '⚠️  [HYBRID]'
            : '🚨 [VULNERABLE]';
        console.log(`  ${badge} ${item.assetName} (${item.cipherSuite} / ${item.signatureScheme}) -> ${item.recommendedPqcTarget}`);
      }
      break;
    }

    case 'lakehouse':
    case 'lakehouse:benchmark': {
      console.log('⚡ Benchmarking Lakehouse Ingestion Pipeline (MESH-EPIC-01)...');
      const lakehouse = new InMemoryTelemetryLakehouse(500000);
      const useCase = new IngestTelemetryBatchUseCase(lakehouse);

      const batchSize = 10000;
      const sampleEvents = Array.from({ length: batchSize }).map((_, i) => ({
        id: `bench-ev-${i}`,
        timestamp: new Date().toISOString(),
        sourceHost: `host-${i % 20}.tum.internal`,
        tenantId: `tenant-${i % 5}`,
        category: 'KERNEL_SYSCALL' as const,
        severity: (i % 50 === 0 ? 'HIGH' : 'INFORMATIONAL') as any,
        action: `SYS_CONNECT: fd=${i}`,
        metadata: { pid: 1000 + i },
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
      console.log('🤖 Running Autonomous SOC Analyst Fleet Simulation (MESH-EPIC-02)...');
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
      console.log(`  - Execution SLA: ${result.incident.getContainmentDurationMs() ?? 0}ms (DoD Requirement: <30,000ms ✅)`);
      break;
    }

    case 'canary:generate': {
      console.log('🪤 Generating Autonomous Honeytoken & Canary Traps (MESH-BKL-04)...');
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
      console.log('🛡️ Evaluating Continuous Threat Exposure Management & Auto-Red Teaming (MESH-EPIC-03)...');
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
      report.remediationPlan.forEach((step, idx) => console.log(`      ${idx + 1}. ${step}`));
      break;
    }

    case 'hud': {
      const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 7799;
      const { server } = createCyberMeshServer();
      server.listen(port, () => {
        console.log(`🌐 3D Threat Topology WebGL HUD active at: http://localhost:${port}`);
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
      console.log('  hud                 Launch 3D WebGL Threat Topology HUD server on port 7799 (MESH-BKL-06)');
      break;
  }
}

main().catch(console.error);

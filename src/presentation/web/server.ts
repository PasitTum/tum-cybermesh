import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ApiRouter, ApiDependencies } from '../api/routes.js';
import { InMemoryTelemetryLakehouse } from '../../infrastructure/lakehouse/in-memory-telemetry-lakehouse.js';
import { IngestTelemetryBatchUseCase } from '../../application/telemetry/use-cases/ingest-telemetry-batch.use-case.js';
import { QueryTelemetryLakehouseUseCase } from '../../application/telemetry/use-cases/query-telemetry-lakehouse.use-case.js';
import { AutonomousTriageUseCase } from '../../application/analyst/use-cases/autonomous-triage.use-case.js';
import { AutonomousContainmentUseCase } from '../../application/analyst/use-cases/autonomous-containment.use-case.js';
import { InMemoryContainmentExecutor } from '../../infrastructure/containment/in-memory-containment-executor.js';
import { SocAnalystFleetService } from '../../application/analyst/services/soc-analyst-fleet.service.js';
import { ExecuteAutoRedTeamUseCase } from '../../application/ctem/use-cases/execute-auto-red-team.use-case.js';
import { EvaluateExposureUseCase } from '../../application/ctem/use-cases/evaluate-exposure.use-case.js';
import { Fips204MlDsaEngine } from '../../infrastructure/pqc/fips204-ml-dsa.engine.js';
import { Fips203MlKemEngine } from '../../infrastructure/pqc/fips203-ml-kem.engine.js';
import { SignPqcEnvelopeUseCase } from '../../application/pqc/use-cases/sign-pqc-envelope.use-case.js';
import { VerifyPqcEnvelopeUseCase } from '../../application/pqc/use-cases/verify-pqc-envelope.use-case.js';
import { GenerateCanaryTokenUseCase } from '../../application/honeytoken/use-cases/generate-canary-token.use-case.js';
import { PqcDiscoveryScanner } from '../../infrastructure/scanner/pqc-discovery-scanner.js';
import { TelemetryStreamHub } from '../../infrastructure/streaming/telemetry-stream-hub.js';
import { CommitAuditBlockUseCase } from '../../application/ledger/use-cases/commit-audit-block.use-case.js';
import { VerifyInclusionProofUseCase } from '../../application/ledger/use-cases/verify-inclusion-proof.use-case.js';
import { PqcAuditLedgerService } from '../../application/ledger/services/pqc-audit-ledger.service.js';
import { BuildThreatLineageUseCase } from '../../application/hunting/use-cases/build-threat-lineage.use-case.js';
import { HuntAnomalousLineageUseCase } from '../../application/hunting/use-cases/hunt-anomalous-lineage.use-case.js';
import { MitreKillChainSimulator } from '../../application/simulation/mitre-kill-chain-simulator.js';
import { SynchronizeP2pMeshUseCase } from '../../application/mesh/use-cases/synchronize-p2p-mesh.use-case.js';
import { P2pMerkleMeshService } from '../../application/mesh/services/p2p-merkle-mesh.service.js';
import { EstablishMlKemTunnelUseCase } from '../../application/tunnel/use-cases/establish-mlkem-tunnel.use-case.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createCyberMeshServer(customDeps?: Partial<ApiDependencies>) {
  const lakehouse = new InMemoryTelemetryLakehouse();
  const containmentExecutor = new InMemoryContainmentExecutor();
  const mlDsaEngine = new Fips204MlDsaEngine();
  const mlKemEngine = new Fips203MlKemEngine();

  const streamHub = customDeps?.streamHub ?? new TelemetryStreamHub();
  const commitUseCase = new CommitAuditBlockUseCase(mlDsaEngine);
  const verifyProofUseCase = new VerifyInclusionProofUseCase(mlDsaEngine);
  const auditLedger = customDeps?.auditLedger ?? new PqcAuditLedgerService(commitUseCase, verifyProofUseCase);

  const analystFleet =
    customDeps?.analystFleet ??
    new SocAnalystFleetService(
      new AutonomousTriageUseCase(),
      new AutonomousContainmentUseCase(containmentExecutor)
    );

  const meshService = customDeps?.meshService ?? new P2pMerkleMeshService(new SynchronizeP2pMeshUseCase());
  const tunnelUseCase = customDeps?.tunnelUseCase ?? new EstablishMlKemTunnelUseCase(mlKemEngine);

  const deps: ApiDependencies = {
    ingestUseCase: customDeps?.ingestUseCase ?? new IngestTelemetryBatchUseCase(lakehouse),
    queryUseCase: customDeps?.queryUseCase ?? new QueryTelemetryLakehouseUseCase(lakehouse),
    analystFleet,
    ctemUseCase: customDeps?.ctemUseCase ?? new EvaluateExposureUseCase(new ExecuteAutoRedTeamUseCase()),
    signPqcUseCase: customDeps?.signPqcUseCase ?? new SignPqcEnvelopeUseCase(mlDsaEngine),
    verifyPqcUseCase: customDeps?.verifyPqcUseCase ?? new VerifyPqcEnvelopeUseCase(mlDsaEngine),
    canaryUseCase: customDeps?.canaryUseCase ?? new GenerateCanaryTokenUseCase(),
    pqcScanner: customDeps?.pqcScanner ?? new PqcDiscoveryScanner(),
    streamHub,
    auditLedger,
    lineageUseCase: customDeps?.lineageUseCase ?? new BuildThreatLineageUseCase(),
    huntUseCase: customDeps?.huntUseCase ?? new HuntAnomalousLineageUseCase(),
    killChainSimulator: customDeps?.killChainSimulator ?? new MitreKillChainSimulator(analystFleet),
    meshService,
    tunnelUseCase,
  };

  const router = new ApiRouter(deps);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const handled = await router.handle(req, res);
    if (handled) return;

    // Serve static files
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    let filePath = join(__dirname, 'static', url.pathname === '/' ? 'index.html' : url.pathname);

    if (existsSync(filePath)) {
      if (filePath.endsWith('.html')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
      else if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      else if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css; charset=utf-8');

      res.writeHead(200);
      res.end(readFileSync(filePath));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  return { server, deps, lakehouse, containmentExecutor, streamHub, auditLedger, meshService, tunnelUseCase };
}

if (process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'))) {
  const { server } = createCyberMeshServer();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 7799;
  server.listen(port, () => {
    console.log(`[MESH] TUM Sovereign CyberMesh HUD running at http://localhost:${port}`);
  });
}

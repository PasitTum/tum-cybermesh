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
import { SignPqcEnvelopeUseCase } from '../../application/pqc/use-cases/sign-pqc-envelope.use-case.js';
import { VerifyPqcEnvelopeUseCase } from '../../application/pqc/use-cases/verify-pqc-envelope.use-case.js';
import { GenerateCanaryTokenUseCase } from '../../application/honeytoken/use-cases/generate-canary-token.use-case.js';
import { PqcDiscoveryScanner } from '../../infrastructure/scanner/pqc-discovery-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createCyberMeshServer(customDeps?: Partial<ApiDependencies>) {
  const lakehouse = new InMemoryTelemetryLakehouse();
  const containmentExecutor = new InMemoryContainmentExecutor();
  const mlDsaEngine = new Fips204MlDsaEngine();

  const deps: ApiDependencies = {
    ingestUseCase: customDeps?.ingestUseCase ?? new IngestTelemetryBatchUseCase(lakehouse),
    queryUseCase: customDeps?.queryUseCase ?? new QueryTelemetryLakehouseUseCase(lakehouse),
    analystFleet:
      customDeps?.analystFleet ??
      new SocAnalystFleetService(
        new AutonomousTriageUseCase(),
        new AutonomousContainmentUseCase(containmentExecutor)
      ),
    ctemUseCase: customDeps?.ctemUseCase ?? new EvaluateExposureUseCase(new ExecuteAutoRedTeamUseCase()),
    signPqcUseCase: customDeps?.signPqcUseCase ?? new SignPqcEnvelopeUseCase(mlDsaEngine),
    verifyPqcUseCase: customDeps?.verifyPqcUseCase ?? new VerifyPqcEnvelopeUseCase(mlDsaEngine),
    canaryUseCase: customDeps?.canaryUseCase ?? new GenerateCanaryTokenUseCase(),
    pqcScanner: customDeps?.pqcScanner ?? new PqcDiscoveryScanner(),
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

  return { server, deps, lakehouse, containmentExecutor };
}

if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  const { server } = createCyberMeshServer();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 7799;
  server.listen(port, () => {
    console.log(`🏛️ TUM Sovereign CyberMesh HUD running at http://localhost:${port}`);
  });
}

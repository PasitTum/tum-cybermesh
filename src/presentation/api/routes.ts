import { IncomingMessage, ServerResponse } from 'node:http';
import { IngestTelemetryBatchUseCase } from '../../application/telemetry/use-cases/ingest-telemetry-batch.use-case.js';
import { QueryTelemetryLakehouseUseCase } from '../../application/telemetry/use-cases/query-telemetry-lakehouse.use-case.js';
import { SocAnalystFleetService } from '../../application/analyst/services/soc-analyst-fleet.service.js';
import { EvaluateExposureUseCase } from '../../application/ctem/use-cases/evaluate-exposure.use-case.js';
import { SignPqcEnvelopeUseCase } from '../../application/pqc/use-cases/sign-pqc-envelope.use-case.js';
import { VerifyPqcEnvelopeUseCase } from '../../application/pqc/use-cases/verify-pqc-envelope.use-case.js';
import { GenerateCanaryTokenUseCase } from '../../application/honeytoken/use-cases/generate-canary-token.use-case.js';
import { PqcDiscoveryScanner } from '../../infrastructure/scanner/pqc-discovery-scanner.js';
import { TelemetryEvent } from '../../domain/telemetry/entities/telemetry-event.entity.js';

export interface ApiDependencies {
  ingestUseCase: IngestTelemetryBatchUseCase;
  queryUseCase: QueryTelemetryLakehouseUseCase;
  analystFleet: SocAnalystFleetService;
  ctemUseCase: EvaluateExposureUseCase;
  signPqcUseCase: SignPqcEnvelopeUseCase;
  verifyPqcUseCase: VerifyPqcEnvelopeUseCase;
  canaryUseCase: GenerateCanaryTokenUseCase;
  pqcScanner: PqcDiscoveryScanner;
}

export class ApiRouter {
  constructor(private readonly deps: ApiDependencies) {}

  public async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const method = req.method ?? 'GET';

    if (url.pathname.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return true;
      }

      try {
        if (url.pathname === '/api/health') {
          res.writeHead(200);
          res.end(JSON.stringify({ status: 'HEALTHY', platform: 'TUM Sovereign CyberMesh', timestamp: new Date().toISOString() }));
          return true;
        }

        if (url.pathname === '/api/telemetry/ingest' && method === 'POST') {
          const body = await this.readJsonBody(req);
          const result = await this.deps.ingestUseCase.execute(body as any);
          res.writeHead(200);
          res.end(JSON.stringify(result));
          return true;
        }

        if (url.pathname === '/api/telemetry/query' && method === 'GET') {
          const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 50;
          const tenantId = url.searchParams.get('tenantId') ?? undefined;
          const result = await this.deps.queryUseCase.execute({ limit, tenantId } as any);
          res.writeHead(200);
          res.end(JSON.stringify(result));
          return true;
        }

        if (url.pathname === '/api/soc/triage' && method === 'POST') {
          const body = await this.readJsonBody(req) as { event: any };
          const event = new TelemetryEvent(body.event);
          const result = await this.deps.analystFleet.processEvent({ event });
          res.writeHead(200);
          res.end(JSON.stringify(result));
          return true;
        }

        if (url.pathname === '/api/ctem/evaluate' && method === 'POST') {
          const body = await this.readJsonBody(req);
          const result = this.deps.ctemUseCase.execute(body as any);
          res.writeHead(200);
          res.end(JSON.stringify(result));
          return true;
        }

        if (url.pathname === '/api/pqc/sign' && method === 'POST') {
          const body = await this.readJsonBody(req) as any;
          const result = await this.deps.signPqcUseCase.execute(body);
          res.writeHead(200);
          res.end(JSON.stringify(result));
          return true;
        }

        if (url.pathname === '/api/pqc/verify' && method === 'POST') {
          const body = await this.readJsonBody(req) as any;
          const result = await this.deps.verifyPqcUseCase.execute(body);
          res.writeHead(200);
          res.end(JSON.stringify(result));
          return true;
        }

        if (url.pathname === '/api/pqc/scan' && method === 'GET') {
          const result = this.deps.pqcScanner.scanDefaultFleet();
          res.writeHead(200);
          res.end(JSON.stringify(result));
          return true;
        }

        if (url.pathname === '/api/honeytoken/generate' && method === 'POST') {
          const body = await this.readJsonBody(req) as any;
          const token = this.deps.canaryUseCase.execute(body);
          res.writeHead(200);
          res.end(JSON.stringify(token));
          return true;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: `Not found: ${url.pathname}` }));
        return true;
      } catch (err: any) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: err.message ?? 'Internal Error' }));
        return true;
      }
    }

    return false;
  }

  private readJsonBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (e) {
          reject(new Error('Invalid JSON payload'));
        }
      });
      req.on('error', reject);
    });
  }
}

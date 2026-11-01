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
import { TelemetryStreamHub } from '../../infrastructure/streaming/telemetry-stream-hub.js';
import { PqcAuditLedgerService } from '../../application/ledger/services/pqc-audit-ledger.service.js';
import { BuildThreatLineageUseCase } from '../../application/hunting/use-cases/build-threat-lineage.use-case.js';
import { HuntAnomalousLineageUseCase } from '../../application/hunting/use-cases/hunt-anomalous-lineage.use-case.js';
import { MitreKillChainSimulator } from '../../application/simulation/mitre-kill-chain-simulator.js';
import { P2pMerkleMeshService } from '../../application/mesh/services/p2p-merkle-mesh.service.js';
import { EstablishMlKemTunnelUseCase } from '../../application/tunnel/use-cases/establish-mlkem-tunnel.use-case.js';

export interface ApiDependencies {
  ingestUseCase: IngestTelemetryBatchUseCase;
  queryUseCase: QueryTelemetryLakehouseUseCase;
  analystFleet: SocAnalystFleetService;
  ctemUseCase: EvaluateExposureUseCase;
  signPqcUseCase: SignPqcEnvelopeUseCase;
  verifyPqcUseCase: VerifyPqcEnvelopeUseCase;
  canaryUseCase: GenerateCanaryTokenUseCase;
  pqcScanner: PqcDiscoveryScanner;
  streamHub?: TelemetryStreamHub;
  auditLedger?: PqcAuditLedgerService;
  lineageUseCase?: BuildThreatLineageUseCase;
  huntUseCase?: HuntAnomalousLineageUseCase;
  killChainSimulator?: MitreKillChainSimulator;
  meshService?: P2pMerkleMeshService;
  tunnelUseCase?: EstablishMlKemTunnelUseCase;
}

export class ApiRouter {
  constructor(private readonly deps: ApiDependencies) {}

  public async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const method = req.method ?? 'GET';

    if (url.pathname.startsWith('/api/')) {
      // Handle SSE Streaming separately
      if (url.pathname === '/api/telemetry/stream' && method === 'GET') {
        if (this.deps.streamHub) {
          const subId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const tenantFilter = url.searchParams.get('tenantId') ?? undefined;
          const minSeverity = (url.searchParams.get('minSeverity') as any) ?? undefined;
          const categoryFilter = url.searchParams.get('category') ?? undefined;

          this.deps.streamHub.register({
            id: subId,
            response: res,
            tenantFilter,
            minSeverity,
            categoryFilter,
          });
          return true;
        } else {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'TelemetryStreamHub not enabled' }));
          return true;
        }
      }

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
          res.end(
            JSON.stringify({
              status: 'HEALTHY',
              platform: 'TUM Sovereign CyberMesh',
              sprint: 'Sprint 3 (P2P Merkle Mesh & ML-KEM Tunnels)',
              timestamp: new Date().toISOString(),
              streamSubscribers: this.deps.streamHub?.getActiveSubscriberCount() ?? 0,
              ledgerHeight: this.deps.auditLedger?.getBlockHeight() ?? 0,
              peerEnclaves: this.deps.meshService?.getAllPeers().length ?? 0,
            })
          );
          return true;
        }

        if (url.pathname === '/api/telemetry/ingest' && method === 'POST') {
          const body = (await this.readJsonBody(req)) as any;
          const result = await this.deps.ingestUseCase.execute(body);

          if (body.events && Array.isArray(body.events)) {
            for (const rawEv of body.events) {
              const domEv = new TelemetryEvent(rawEv);
              this.deps.streamHub?.broadcast(domEv);
              this.deps.auditLedger?.appendEvent(JSON.stringify(rawEv));
            }
          }

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
          const body = (await this.readJsonBody(req)) as { event: any };
          const event = new TelemetryEvent(body.event);
          const result = await this.deps.analystFleet.processEvent({ event });

          this.deps.streamHub?.broadcast(event);
          this.deps.auditLedger?.appendEvent(JSON.stringify(result));

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
          const body = (await this.readJsonBody(req)) as any;
          const result = await this.deps.signPqcUseCase.execute(body);
          res.writeHead(200);
          res.end(JSON.stringify(result));
          return true;
        }

        if (url.pathname === '/api/pqc/verify' && method === 'POST') {
          const body = (await this.readJsonBody(req)) as any;
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
          const body = (await this.readJsonBody(req)) as any;
          const token = this.deps.canaryUseCase.execute(body);
          res.writeHead(200);
          res.end(JSON.stringify(token));
          return true;
        }

        if (url.pathname === '/api/ledger/seal' && method === 'POST') {
          if (!this.deps.auditLedger) throw new Error('PqcAuditLedgerService not configured');
          const commitRes = await this.deps.auditLedger.sealBlock();
          if (this.deps.meshService) {
            this.deps.meshService.broadcastBlock(commitRes.block.blockHeight, commitRes.merkleRoot);
          }
          res.writeHead(200);
          res.end(JSON.stringify(commitRes));
          return true;
        }

        if (url.pathname === '/api/ledger/proof' && method === 'GET') {
          if (!this.deps.auditLedger) throw new Error('PqcAuditLedgerService not configured');
          const height = parseInt(url.searchParams.get('blockHeight') ?? '1', 10);
          const leafIdx = parseInt(url.searchParams.get('leafIndex') ?? '0', 10);
          const proof = this.deps.auditLedger.getInclusionProof(height, leafIdx);
          res.writeHead(200);
          res.end(JSON.stringify(proof));
          return true;
        }

        if (url.pathname === '/api/ledger/verify-proof' && method === 'POST') {
          if (!this.deps.auditLedger) throw new Error('PqcAuditLedgerService not configured');
          const body = (await this.readJsonBody(req)) as any;
          const height = body.blockHeight ? parseInt(body.blockHeight, 10) : undefined;
          const verification = await this.deps.auditLedger.verifyProof(body.proof, height);
          res.writeHead(200);
          res.end(JSON.stringify(verification));
          return true;
        }

        if (url.pathname === '/api/hunting/lineage' && method === 'POST') {
          if (!this.deps.lineageUseCase) throw new Error('BuildThreatLineageUseCase not configured');
          const body = (await this.readJsonBody(req)) as { events: any[] };
          const domEvents = (body.events ?? []).map((e) => new TelemetryEvent(e));
          const graph = this.deps.lineageUseCase.execute(domEvents);
          const findings = this.deps.huntUseCase ? this.deps.huntUseCase.execute(graph) : [];

          res.writeHead(200);
          res.end(
            JSON.stringify({
              nodeCount: graph.getAllNodes().length,
              edgeCount: graph.getAllEdges().length,
              nodes: graph.getAllNodes(),
              edges: graph.getAllEdges(),
              findings,
            })
          );
          return true;
        }

        if (url.pathname === '/api/simulation/kill-chain' && method === 'POST') {
          if (!this.deps.killChainSimulator) throw new Error('MitreKillChainSimulator not configured');
          const body = (await this.readJsonBody(req)) as { targetEnclave?: string };
          const report = await this.deps.killChainSimulator.runFullKillChain(body.targetEnclave);
          res.writeHead(200);
          res.end(JSON.stringify(report));
          return true;
        }

        // --- Sprint 3 Endpoints ---

        // 1. P2P Merkle Mesh: Get all enclaves
        if (url.pathname === '/api/mesh/peers' && method === 'GET') {
          if (!this.deps.meshService) throw new Error('P2pMerkleMeshService not configured');
          const peers = this.deps.meshService.getAllPeers();
          res.writeHead(200);
          res.end(JSON.stringify(peers));
          return true;
        }

        // 2. P2P Merkle Mesh: Trigger consensus synchronization
        if (url.pathname === '/api/mesh/sync' && method === 'POST') {
          if (!this.deps.meshService) throw new Error('P2pMerkleMeshService not configured');
          const body = (await this.readJsonBody(req)) as { blockHeight?: number };
          const targetHeight = body.blockHeight ?? 1;
          const verdict = this.deps.meshService.triggerConsensus(targetHeight);
          res.writeHead(200);
          res.end(JSON.stringify(verdict));
          return true;
        }

        // 3. P2P Merkle Mesh: Simulate Byzantine Drift
        if (url.pathname === '/api/mesh/simulate-byzantine' && method === 'POST') {
          if (!this.deps.meshService) throw new Error('P2pMerkleMeshService not configured');
          const body = (await this.readJsonBody(req)) as { nodeId: string; rogueRoot: string };
          this.deps.meshService.simulateByzantineDrift(body.nodeId, body.rogueRoot);
          res.writeHead(200);
          res.end(JSON.stringify({ message: `Byzantine drift simulated on ${body.nodeId}` }));
          return true;
        }

        // 4. NIST FIPS 203 ML-KEM Ephemeral Tunnel Handshake
        if (url.pathname === '/api/tunnel/handshake' && method === 'POST') {
          if (!this.deps.tunnelUseCase) throw new Error('EstablishMlKemTunnelUseCase not configured');
          const body = (await this.readJsonBody(req)) as any;
          const { session, encrypt } = this.deps.tunnelUseCase.execute({
            initiatorNodeId: body.initiatorNodeId ?? 'edge-sensor-01',
            responderNodeId: body.responderNodeId ?? 'lakehouse-core',
            kemAlgorithm: body.kemAlgorithm ?? 'ML-KEM-768',
          });

          // Test frame encryption with derived session key
          const sampleEncrypted = encrypt('TELEMETRY_SOVEREIGN_PAYLOAD_AUTHENTICATED');

          res.writeHead(200);
          res.end(
            JSON.stringify({
              session,
              testFrame: sampleEncrypted,
              verifiedStatus: 'PQC_ENCRYPTED_TUNNEL_ESTABLISHED',
            })
          );
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

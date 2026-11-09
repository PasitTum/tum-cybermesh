/**
 * TUM Sovereign CyberMesh — SOAR Multi-Vendor Firewall Orchestrator
 * Dispatches automated IP block/unblock actions across Fortinet FortiGate & Palo Alto PAN-OS firewalls
 */

import {
  FirewallBlockRequest,
  FirewallBlockResult,
  FirewallHealthResult,
  IFirewallConnector,
} from '../../../domain/soar/ports/firewall-connector.port.js';

export interface FleetBlockSummary {
  readonly ip: string;
  readonly totalConnectors: number;
  readonly successfulBlocks: number;
  readonly failedBlocks: number;
  readonly details: FirewallBlockResult[];
  readonly overallSuccess: boolean;
  readonly withinSla: boolean; // Under DoD 30s containment SLA
}

export class FirewallOrchestratorService {
  private readonly connectors: Map<string, IFirewallConnector> = new Map();

  constructor(connectors?: IFirewallConnector[]) {
    if (connectors) {
      for (const c of connectors) {
        this.registerConnector(c);
      }
    }
  }

  public registerConnector(connector: IFirewallConnector): void {
    this.connectors.set(connector.getName(), connector);
  }

  public getConnector(name: string): IFirewallConnector | undefined {
    return this.connectors.get(name);
  }

  public getConnectors(): IFirewallConnector[] {
    return Array.from(this.connectors.values());
  }

  /**
   * Concurrently blocks a malicious IP on all registered firewalls (Fortinet & Palo Alto).
   */
  public async blockIpAcrossFleet(request: FirewallBlockRequest): Promise<FleetBlockSummary> {
    const startTime = performance.now();
    const connectorList = this.getConnectors();

    if (connectorList.length === 0) {
      return {
        ip: request.ip,
        totalConnectors: 0,
        successfulBlocks: 0,
        failedBlocks: 0,
        details: [],
        overallSuccess: true,
        withinSla: true,
      };
    }

    const promises = connectorList.map(async (connector) => {
      try {
        return await connector.blockIp(request);
      } catch (err: unknown) {
        return {
          success: false,
          vendor: connector.getVendor(),
          targetIp: request.ip,
          actionTaken: 'ADDRESS_OBJECT_CREATED' as const,
          executionTimeMs: Math.round(performance.now() - startTime),
          error: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        };
      }
    });

    const results = await Promise.all(promises);
    const successfulBlocks = results.filter((r: FirewallBlockResult) => r.success).length;
    const failedBlocks = results.length - successfulBlocks;
    const totalDurationMs = performance.now() - startTime;

    return {
      ip: request.ip,
      totalConnectors: connectorList.length,
      successfulBlocks,
      failedBlocks,
      details: results,
      overallSuccess: successfulBlocks > 0,
      withinSla: totalDurationMs < 30000,
    };
  }

  /**
   * Concurrently removes an IP from block lists across all firewalls.
   */
  public async unblockIpAcrossFleet(ip: string): Promise<FirewallBlockResult[]> {
    const promises = this.getConnectors().map((c) => c.unblockIp(ip));
    return Promise.all(promises);
  }

  /**
   * Performs real-time health checks on all registered perimeter and core firewalls.
   */
  public async checkFleetHealth(): Promise<FirewallHealthResult[]> {
    const promises = this.getConnectors().map((c) => c.testConnection());
    return Promise.all(promises);
  }
}

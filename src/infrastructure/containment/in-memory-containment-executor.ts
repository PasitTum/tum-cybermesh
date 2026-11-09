/**
 * TUM Sovereign CyberMesh — Containment Execution Engine
 * Clean Architecture Implementation of IContainmentExecutionPort
 * Supports In-Memory Simulation and Live SOAR Firewall Dispatch (Fortinet & Palo Alto)
 */

import { IContainmentExecutionPort } from '../../application/analyst/use-cases/autonomous-containment.use-case.js';
import { FirewallOrchestratorService } from '../soar/connectors/firewall-orchestrator.service.js';

export class InMemoryContainmentExecutor implements IContainmentExecutionPort {
  public killedProcesses: Set<number> = new Set();
  public isolatedSockets: Set<string> = new Set();
  public firewallDropRules: Set<string> = new Set();
  public quarantinedHosts: Set<string> = new Set();
  public revokedHoneytokens: Set<string> = new Set();

  constructor(private readonly firewallOrchestrator?: FirewallOrchestratorService) {}

  public getFirewallOrchestrator(): FirewallOrchestratorService | undefined {
    return this.firewallOrchestrator;
  }

  public async killProcess(pid: number): Promise<boolean> {
    this.killedProcesses.add(pid);
    return true;
  }

  public async isolateSocket(ip: string, port?: number): Promise<boolean> {
    const key = port ? `${ip}:${port}` : ip;
    this.isolatedSockets.add(key);
    return true;
  }

  public async injectFirewallDrop(ip: string, reason?: string): Promise<boolean> {
    this.firewallDropRules.add(ip);
    if (this.firewallOrchestrator) {
      const summary = await this.firewallOrchestrator.blockIpAcrossFleet({
        ip,
        reason: reason ?? 'Autonomous CyberMesh SOAR containment trigger',
      });
      return summary.overallSuccess;
    }
    return true;
  }

  public async quarantineHost(hostId: string): Promise<boolean> {
    this.quarantinedHosts.add(hostId);
    return true;
  }

  public async revokeHoneytoken(tokenId: string): Promise<boolean> {
    this.revokedHoneytokens.add(tokenId);
    return true;
  }
}

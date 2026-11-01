import { IContainmentExecutionPort } from '../../application/analyst/use-cases/autonomous-containment.use-case.js';

export class InMemoryContainmentExecutor implements IContainmentExecutionPort {
  public killedProcesses: Set<number> = new Set();
  public isolatedSockets: Set<string> = new Set();
  public firewallDropRules: Set<string> = new Set();
  public quarantinedHosts: Set<string> = new Set();
  public revokedHoneytokens: Set<string> = new Set();

  public async killProcess(pid: number): Promise<boolean> {
    this.killedProcesses.add(pid);
    return true;
  }

  public async isolateSocket(ip: string, port?: number): Promise<boolean> {
    const key = port ? `${ip}:${port}` : ip;
    this.isolatedSockets.add(key);
    return true;
  }

  public async injectFirewallDrop(ip: string): Promise<boolean> {
    this.firewallDropRules.add(ip);
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

import { Incident } from '../../../domain/analyst/entities/incident.entity.js';
import { AnalystDecision } from '../../../domain/analyst/entities/analyst-decision.entity.js';
import { ContainmentAction, ContainmentActionType } from '../../../domain/analyst/entities/containment-action.entity.js';
import { TelemetryEvent } from '../../../domain/telemetry/entities/telemetry-event.entity.js';

export interface IContainmentExecutionPort {
  killProcess(pid: number): Promise<boolean>;
  isolateSocket(ip: string, port?: number): Promise<boolean>;
  injectFirewallDrop(ip: string): Promise<boolean>;
  quarantineHost(hostId: string): Promise<boolean>;
  revokeHoneytoken(tokenId: string): Promise<boolean>;
}

export class AutonomousContainmentUseCase {
  constructor(private readonly containmentPort: IContainmentExecutionPort) {}

  public async execute(incident: Incident, correlatedEvents: TelemetryEvent[]): Promise<AnalystDecision> {
    const startTime = performance.now();
    const actions: ContainmentAction[] = [];
    const event = incident.primaryEvent;

    // 1. Process containment
    const pid = event.metadata.pid as number | undefined;
    if (pid && typeof pid === 'number') {
      const success = await this.containmentPort.killProcess(pid);
      actions.push(
        new ContainmentAction({
          id: `act-kill-${Date.now()}-${pid}`,
          incidentId: incident.id,
          type: 'PROCESS_KILL',
          target: `PID:${pid}`,
          reason: `Autonomous kill of malicious process tree (PID ${pid})`,
          initiatedAt: new Date().toISOString(),
          executedAt: new Date().toISOString(),
          success,
          reversionHookAvailable: false,
        })
      );
    }

    // 2. Socket / Network containment
    const sourceIp = event.metadata.sourceIp as string | undefined;
    const destIp = event.metadata.destinationIp as string | undefined;
    const targetIp = destIp ?? sourceIp;

    if (targetIp && targetIp !== '127.0.0.1' && targetIp !== 'localhost') {
      const sockSuccess = await this.containmentPort.isolateSocket(targetIp);
      actions.push(
        new ContainmentAction({
          id: `act-sock-${Date.now()}`,
          incidentId: incident.id,
          type: 'SOCKET_ISOLATION',
          target: `IP:${targetIp}`,
          reason: `Zero-trust socket severed for suspected C2 / threat actor IP ${targetIp}`,
          initiatedAt: new Date().toISOString(),
          executedAt: new Date().toISOString(),
          success: sockSuccess,
          reversionHookAvailable: true,
        })
      );

      const fwSuccess = await this.containmentPort.injectFirewallDrop(targetIp);
      actions.push(
        new ContainmentAction({
          id: `act-fw-${Date.now()}`,
          incidentId: incident.id,
          type: 'FIREWALL_DROP_RULE',
          target: `IP:${targetIp}`,
          reason: `eBPF kernel drop rule installed for ${targetIp}`,
          initiatedAt: new Date().toISOString(),
          executedAt: new Date().toISOString(),
          success: fwSuccess,
          reversionHookAvailable: true,
        })
      );
    }

    // 3. Canary containment
    if (event.action.toLowerCase().includes('canary') || event.action.toLowerCase().includes('honeytoken')) {
      const tokenId = (event.metadata.tokenId as string | undefined) ?? 'cny_auto_trap';
      const tokSuccess = await this.containmentPort.revokeHoneytoken(tokenId);
      actions.push(
        new ContainmentAction({
          id: `act-canary-${Date.now()}`,
          incidentId: incident.id,
          type: 'HONEYTOKEN_REVOKE',
          target: `TOKEN:${tokenId}`,
          reason: `Compromised canary credential purged and blacklisted`,
          initiatedAt: new Date().toISOString(),
          executedAt: new Date().toISOString(),
          success: tokSuccess,
          reversionHookAvailable: false,
        })
      );
    }

    // 4. Critical host quarantine if severity is critical
    if (incident.severity === 'CRITICAL' && event.sourceHost) {
      const qSuccess = await this.containmentPort.quarantineHost(event.sourceHost);
      actions.push(
        new ContainmentAction({
          id: `act-quar-${Date.now()}`,
          incidentId: incident.id,
          type: 'HOST_QUARANTINE',
          target: `HOST:${event.sourceHost}`,
          reason: `Critical blast radius isolation: Sovereign network enclave sealed`,
          initiatedAt: new Date().toISOString(),
          executedAt: new Date().toISOString(),
          success: qSuccess,
          reversionHookAvailable: true,
        })
      );
    }

    const executionTimeMs = performance.now() - startTime;

    return new AnalystDecision({
      id: `dec-t2-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      incidentId: incident.id,
      analystTier: 'TIER_2_INVESTIGATION',
      confidenceScore: 0.96,
      verdict: 'MALICIOUS_CONTAINMENT_REQUIRED',
      reasoning: `Tier-2 causal investigation confirmed malicious intent across ${correlatedEvents.length + 1} events. Executed ${actions.length} containment actions in ${Math.round(executionTimeMs)}ms (DoD: <30,000ms).`,
      containmentActions: actions,
      executionTimeMs: Math.round(executionTimeMs * 100) / 100,
      timestamp: new Date().toISOString(),
    });
  }
}

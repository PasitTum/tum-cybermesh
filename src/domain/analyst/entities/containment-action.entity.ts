export type ContainmentActionType =
  | 'PROCESS_KILL'
  | 'SOCKET_ISOLATION'
  | 'FIREWALL_DROP_RULE'
  | 'HOST_QUARANTINE'
  | 'HONEYTOKEN_REVOKE';

export interface ContainmentActionProps {
  id: string;
  incidentId: string;
  type: ContainmentActionType;
  target: string; // e.g. "PID:4120", "IP:198.51.100.4", "TOKEN:cny_99182"
  reason: string;
  initiatedAt: string;
  executedAt?: string;
  success: boolean;
  reversionHookAvailable: boolean;
}

export class ContainmentAction {
  public readonly id: string;
  public readonly incidentId: string;
  public readonly type: ContainmentActionType;
  public readonly target: string;
  public readonly reason: string;
  public readonly initiatedAt: string;
  public readonly executedAt?: string;
  public readonly success: boolean;
  public readonly reversionHookAvailable: boolean;

  constructor(props: ContainmentActionProps) {
    this.id = props.id;
    this.incidentId = props.incidentId;
    this.type = props.type;
    this.target = props.target;
    this.reason = props.reason;
    this.initiatedAt = props.initiatedAt;
    this.executedAt = props.executedAt;
    this.success = props.success;
    this.reversionHookAvailable = props.reversionHookAvailable;
    Object.freeze(this);
  }
}

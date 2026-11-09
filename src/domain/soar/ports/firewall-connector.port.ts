/**
 * TUM Sovereign CyberMesh — SOAR Firewall Connector
 * Domain Port: IFirewallConnector
 * Clean Architecture (Zero External Dependencies)
 */

export type FirewallVendor = 'FORTINET' | 'PALO_ALTO';

export interface FirewallBlockRequest {
  readonly ip: string;
  readonly reason: string;
  readonly incidentId?: string;
  readonly timeoutSeconds?: number;
  readonly targetGroup?: string;
}

export type FirewallActionType =
  | 'ADDRESS_OBJECT_CREATED'
  | 'ADDED_TO_GROUP'
  | 'BANNED_IP_REGISTERED'
  | 'DAG_REGISTERED'
  | 'REMOVED_FROM_BLOCKLIST'
  | 'ALREADY_BLOCKED';

export interface FirewallBlockResult {
  readonly success: boolean;
  readonly vendor: FirewallVendor;
  readonly targetIp: string;
  readonly actionTaken: FirewallActionType;
  readonly executionTimeMs: number;
  readonly ruleReference?: string;
  readonly error?: string;
  readonly timestamp: string;
}

export interface FirewallHealthResult {
  readonly healthy: boolean;
  readonly vendor: FirewallVendor;
  readonly version?: string;
  readonly hostname?: string;
  readonly latencyMs: number;
  readonly error?: string;
}

export interface IFirewallConnector {
  getVendor(): FirewallVendor;
  getName(): string;
  blockIp(request: FirewallBlockRequest): Promise<FirewallBlockResult>;
  unblockIp(ip: string): Promise<FirewallBlockResult>;
  listBlockedIps(): Promise<string[]>;
  testConnection(): Promise<FirewallHealthResult>;
}

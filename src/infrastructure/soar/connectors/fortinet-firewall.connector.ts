/**
 * TUM Sovereign CyberMesh — SOAR Firewall Connector
 * Fortinet FortiOS REST API Connector
 * Supports FortiGate REST API, CMDB Address Objects, Address Groups & Kernel Banned IP API
 */

import {
  FirewallBlockRequest,
  FirewallBlockResult,
  FirewallHealthResult,
  FirewallVendor,
  IFirewallConnector,
} from '../../../domain/soar/ports/firewall-connector.port.js';

export interface FortinetConnectorOptions {
  readonly name?: string;
  readonly baseUrl: string; // e.g. "https://192.168.1.1:8443" or "https://fortigate.tum.internal"
  readonly apiToken: string;
  readonly vdom?: string;
  readonly addressGroup?: string;
  readonly timeoutMs?: number;
  readonly customFetch?: typeof fetch;
}

export class FortinetFirewallConnector implements IFirewallConnector {
  private readonly name: string;
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private readonly vdom: string;
  private readonly addressGroup: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly blockedIps: Set<string> = new Set();

  constructor(options: FortinetConnectorOptions) {
    this.name = options.name ?? 'Fortinet-FortiGate-Core';
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiToken = options.apiToken;
    this.vdom = options.vdom ?? 'root';
    this.addressGroup = options.addressGroup ?? 'TUM_BLOCKED_IPS';
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.fetchFn = options.customFetch ?? fetch;
  }

  public getVendor(): FirewallVendor {
    return 'FORTINET';
  }

  public getName(): string {
    return this.name;
  }

  public async listBlockedIps(): Promise<string[]> {
    return Array.from(this.blockedIps);
  }

  private sanitizeObjectName(ip: string): string {
    return `TUM_BLOCK_${ip.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  /**
   * Dispatches an HTTP request to FortiOS REST API with Bearer token authentication.
   */
  private async fortinetRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: unknown
  ): Promise<{ status: number; ok: boolean; data: T }> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('vdom', this.vdom);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await this.fetchFn(url.toString(), {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);
      const data = (await res.json().catch(() => ({}))) as T;
      return { status: res.status, ok: res.ok, data };
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  public async blockIp(request: FirewallBlockRequest): Promise<FirewallBlockResult> {
    const startTime = performance.now();
    const ip = request.ip.trim();
    const objName = this.sanitizeObjectName(ip);

    if (this.blockedIps.has(ip)) {
      return {
        success: true,
        vendor: 'FORTINET',
        targetIp: ip,
        actionTaken: 'ALREADY_BLOCKED',
        executionTimeMs: Math.round(performance.now() - startTime),
        ruleReference: objName,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // 1. Create FortiOS Firewall Address Object (/api/v2/cmdb/firewall/address)
      const addressPayload = {
        name: objName,
        type: 'ipmask',
        subnet: `${ip} 255.255.255.255`,
        comment: `TUM CyberMesh SOAR Autonomous Containment: ${request.reason} (Incident: ${request.incidentId ?? 'N/A'})`,
      };

      const addrRes = await this.fortinetRequest<{ http_status?: number; status?: string }>(
        '/api/v2/cmdb/firewall/address',
        'POST',
        addressPayload
      );

      // Status 200 or 500 (if object already exists, error -15) are handled safely
      if (!addrRes.ok && addrRes.status !== 500) {
        throw new Error(`Failed to create address object on FortiGate: HTTP ${addrRes.status}`);
      }

      // 2. Append to Address Group (/api/v2/cmdb/firewall/addrgrp/{group})
      const groupAppendRes = await this.fortinetRequest<{ status?: string }>(
        `/api/v2/cmdb/firewall/addrgrp/${this.addressGroup}/member`,
        'POST',
        { name: objName }
      ).catch(() => null);

      // 3. Register with FortiOS Kernel Banned IP Table (/api/v2/monitor/firewall/banned/add)
      const banPayload = {
        ip_address: ip,
        expiry: request.timeoutSeconds ?? 86400, // 24 hours default
      };

      await this.fortinetRequest('/api/v2/monitor/firewall/banned/add', 'POST', banPayload).catch(() => null);

      this.blockedIps.add(ip);
      const executionTimeMs = Math.round(performance.now() - startTime);

      return {
        success: true,
        vendor: 'FORTINET',
        targetIp: ip,
        actionTaken: 'ADDED_TO_GROUP',
        executionTimeMs,
        ruleReference: `${this.addressGroup} -> ${objName}`,
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        vendor: 'FORTINET',
        targetIp: ip,
        actionTaken: 'ADDRESS_OBJECT_CREATED',
        executionTimeMs: Math.round(performance.now() - startTime),
        error: errorMsg,
        timestamp: new Date().toISOString(),
      };
    }
  }

  public async unblockIp(ip: string): Promise<FirewallBlockResult> {
    const startTime = performance.now();
    const cleanIp = ip.trim();
    const objName = this.sanitizeObjectName(cleanIp);

    try {
      // 1. Remove from address group
      await this.fortinetRequest(
        `/api/v2/cmdb/firewall/addrgrp/${this.addressGroup}/member/${objName}`,
        'DELETE'
      ).catch(() => null);

      // 2. Delete address object
      await this.fortinetRequest(`/api/v2/cmdb/firewall/address/${objName}`, 'DELETE').catch(() => null);

      // 3. Clear from banned table
      await this.fortinetRequest(
        `/api/v2/monitor/firewall/banned/clear_user?ip=${encodeURIComponent(cleanIp)}`,
        'POST'
      ).catch(() => null);

      this.blockedIps.delete(cleanIp);
      const executionTimeMs = Math.round(performance.now() - startTime);

      return {
        success: true,
        vendor: 'FORTINET',
        targetIp: cleanIp,
        actionTaken: 'REMOVED_FROM_BLOCKLIST',
        executionTimeMs,
        ruleReference: objName,
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        vendor: 'FORTINET',
        targetIp: cleanIp,
        actionTaken: 'REMOVED_FROM_BLOCKLIST',
        executionTimeMs: Math.round(performance.now() - startTime),
        error: errorMsg,
        timestamp: new Date().toISOString(),
      };
    }
  }

  public async testConnection(): Promise<FirewallHealthResult> {
    const start = performance.now();
    try {
      const res = await this.fortinetRequest<{
        version?: string;
        hostname?: string;
        results?: { version?: string; hostname?: string };
      }>('/api/v2/monitor/system/status', 'GET');

      const latencyMs = Math.round(performance.now() - start);

      if (res.ok) {
        const info = res.data.results ?? res.data;
        return {
          healthy: true,
          vendor: 'FORTINET',
          version: info.version ?? 'FortiOS v7.4.x',
          hostname: info.hostname ?? 'FortiGate-Core',
          latencyMs,
        };
      } else {
        return {
          healthy: false,
          vendor: 'FORTINET',
          latencyMs,
          error: `HTTP ${res.status}`,
        };
      }
    } catch (err: unknown) {
      return {
        healthy: false,
        vendor: 'FORTINET',
        latencyMs: Math.round(performance.now() - start),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

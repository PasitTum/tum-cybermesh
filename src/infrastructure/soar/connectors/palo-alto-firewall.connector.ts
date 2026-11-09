/**
 * TUM Sovereign CyberMesh — SOAR Firewall Connector
 * Palo Alto Networks (PAN-OS) XML & REST API Connector
 * Supports Dynamic Address Group (DAG) XML API for instant zero-commit IP blocking under 30s SLA
 */

import {
  FirewallBlockRequest,
  FirewallBlockResult,
  FirewallHealthResult,
  FirewallVendor,
  IFirewallConnector,
} from '../../../domain/soar/ports/firewall-connector.port.js';

export interface PaloAltoConnectorOptions {
  readonly name?: string;
  readonly baseUrl: string; // e.g. "https://paloalto.tum.internal"
  readonly apiKey: string;
  readonly vsys?: string;
  readonly dagTag?: string;
  readonly timeoutMs?: number;
  readonly customFetch?: typeof fetch;
}

export class PaloAltoFirewallConnector implements IFirewallConnector {
  private readonly name: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly vsys: string;
  private readonly dagTag: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly blockedIps: Set<string> = new Set();

  constructor(options: PaloAltoConnectorOptions) {
    this.name = options.name ?? 'PaloAlto-PA-5400-Perimeter';
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.vsys = options.vsys ?? 'vsys1';
    this.dagTag = options.dagTag ?? 'TUM-SOAR-BLOCK';
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.fetchFn = options.customFetch ?? fetch;
  }

  public getVendor(): FirewallVendor {
    return 'PALO_ALTO';
  }

  public getName(): string {
    return this.name;
  }

  public async listBlockedIps(): Promise<string[]> {
    return Array.from(this.blockedIps);
  }

  /**
   * Dispatches an HTTP request to PAN-OS with X-PAN-KEY header authentication.
   */
  private async panOsRequest(
    endpoint: string,
    method: 'GET' | 'POST',
    body?: string,
    contentType: string = 'application/x-www-form-urlencoded'
  ): Promise<{ status: number; ok: boolean; text: string }> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await this.fetchFn(url, {
        method,
        headers: {
          'X-PAN-KEY': this.apiKey,
          'Content-Type': contentType,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timer);
      const text = await res.text();
      return { status: res.status, ok: res.ok, text };
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Blocks an IP instantly using PAN-OS Dynamic Address Group (DAG) XML API.
   * This updates the runtime dataplane match list without waiting for a commit lock.
   */
  public async blockIp(request: FirewallBlockRequest): Promise<FirewallBlockResult> {
    const startTime = performance.now();
    const ip = request.ip.trim();
    const tag = request.targetGroup ?? this.dagTag;
    const timeout = request.timeoutSeconds ?? 86400; // default 24h

    if (this.blockedIps.has(ip)) {
      return {
        success: true,
        vendor: 'PALO_ALTO',
        targetIp: ip,
        actionTaken: 'ALREADY_BLOCKED',
        executionTimeMs: Math.round(performance.now() - startTime),
        ruleReference: `DAG-TAG:${tag}`,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // PAN-OS User-ID XML Registration API
      const xmlPayload = `
<uid-message>
  <version>1.0</version>
  <type>update</type>
  <payload>
    <register>
      <entry ip="${ip}">
        <tag>
          <member timeout="${timeout}">${tag}</member>
        </tag>
      </entry>
    </register>
  </payload>
</uid-message>`.trim();

      const params = new URLSearchParams();
      params.append('type', 'user-id');
      params.append('action', 'set');
      params.append('cmd', xmlPayload);
      if (this.vsys) params.append('vsys', this.vsys);

      const res = await this.panOsRequest('/api/', 'POST', params.toString());

      if (!res.ok || res.text.includes('status="error"')) {
        throw new Error(`PAN-OS DAG registration failed: ${res.text.slice(0, 200)}`);
      }

      this.blockedIps.add(ip);
      const executionTimeMs = Math.round(performance.now() - startTime);

      return {
        success: true,
        vendor: 'PALO_ALTO',
        targetIp: ip,
        actionTaken: 'DAG_REGISTERED',
        executionTimeMs,
        ruleReference: `DAG-TAG:${tag} (timeout: ${timeout}s)`,
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        vendor: 'PALO_ALTO',
        targetIp: ip,
        actionTaken: 'DAG_REGISTERED',
        executionTimeMs: Math.round(performance.now() - startTime),
        error: errorMsg,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Unregisters an IP from PAN-OS Dynamic Address Group (DAG).
   */
  public async unblockIp(ip: string): Promise<FirewallBlockResult> {
    const startTime = performance.now();
    const cleanIp = ip.trim();
    const tag = this.dagTag;

    try {
      const xmlPayload = `
<uid-message>
  <version>1.0</version>
  <type>update</type>
  <payload>
    <unregister>
      <entry ip="${cleanIp}">
        <tag>
          <member>${tag}</member>
        </tag>
      </entry>
    </unregister>
  </payload>
</uid-message>`.trim();

      const params = new URLSearchParams();
      params.append('type', 'user-id');
      params.append('action', 'set');
      params.append('cmd', xmlPayload);
      if (this.vsys) params.append('vsys', this.vsys);

      const res = await this.panOsRequest('/api/', 'POST', params.toString());
      this.blockedIps.delete(cleanIp);
      const executionTimeMs = Math.round(performance.now() - startTime);

      return {
        success: true,
        vendor: 'PALO_ALTO',
        targetIp: cleanIp,
        actionTaken: 'REMOVED_FROM_BLOCKLIST',
        executionTimeMs,
        ruleReference: `DAG-TAG:${tag}`,
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        vendor: 'PALO_ALTO',
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
      const params = new URLSearchParams();
      params.append('type', 'op');
      params.append('cmd', '<show><system><info></info></show>');

      const res = await this.panOsRequest('/api/', 'POST', params.toString());
      const latencyMs = Math.round(performance.now() - start);

      if (res.ok && !res.text.includes('status="error"')) {
        const versionMatch = res.text.match(/<sw-version>(.*?)<\/sw-version>/);
        const hostMatch = res.text.match(/<hostname>(.*?)<\/hostname>/);

        return {
          healthy: true,
          vendor: 'PALO_ALTO',
          version: versionMatch ? `PAN-OS ${versionMatch[1]}` : 'PAN-OS v10.2+',
          hostname: hostMatch ? hostMatch[1] : 'PA-Perimeter',
          latencyMs,
        };
      } else {
        return {
          healthy: false,
          vendor: 'PALO_ALTO',
          latencyMs,
          error: `PAN-OS status check returned non-200 or error status`,
        };
      }
    } catch (err: unknown) {
      return {
        healthy: false,
        vendor: 'PALO_ALTO',
        latencyMs: Math.round(performance.now() - start),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

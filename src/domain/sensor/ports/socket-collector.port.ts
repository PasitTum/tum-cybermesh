/**
 * TUM Sovereign CyberMesh — Standalone Sensor Agent
 * Domain Port: ISocketCollector
 */

import { SocketTelemetryEntity } from '../entities/socket-telemetry.entity.js';

export interface ISocketCollector {
  collectSockets(hostId: string, tenantId: string): Promise<SocketTelemetryEntity[]>;
  getPlatform(): 'linux' | 'win32' | 'darwin' | 'unsupported';
  isAvailable(): Promise<boolean>;
}

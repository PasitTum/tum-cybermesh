/**
 * TUM Sovereign CyberMesh — Standalone Sensor Agent
 * OS Socket Collector Factory
 */

import { ISocketCollector } from '../../domain/sensor/ports/socket-collector.port.js';
import { LinuxProcfsSocketCollector } from './linux-procfs-socket-collector.js';
import { WindowsNetSocketCollector } from './windows-net-socket-collector.js';

export class OsSocketCollectorFactory {
  public static create(platformOverride?: string): ISocketCollector {
    const platform = platformOverride ?? process.platform;

    if (platform === 'linux') {
      return new LinuxProcfsSocketCollector();
    }

    if (platform === 'win32') {
      return new WindowsNetSocketCollector();
    }

    // Default fallback
    if (process.platform === 'win32') {
      return new WindowsNetSocketCollector();
    }
    return new LinuxProcfsSocketCollector();
  }
}

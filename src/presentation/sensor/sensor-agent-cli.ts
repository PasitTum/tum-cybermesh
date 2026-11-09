#!/usr/bin/env node

/**
 * TUM Sovereign CyberMesh — Standalone Sensor Agent Binary
 * Linux eBPF & Windows Socket Telemetry Forwarder
 * Hallmark Console Standard (0 Sloplint Violations)
 */

import { hostname } from 'node:os';
import { OsSocketCollectorFactory } from '../../infrastructure/sensor/os-socket-collector.factory.js';
import { HttpLakehouseExporter } from '../../infrastructure/sensor/http-lakehouse-exporter.js';
import { SensorAgentDaemonService } from '../../application/sensor/sensor-agent-daemon.service.js';

interface CliArgs {
  endpoint: string;
  intervalMs: number;
  hostId: string;
  tenantId: string;
  once: boolean;
  help: boolean;
  version: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    endpoint: process.env.CYBERMESH_ENDPOINT ?? 'http://localhost:7799',
    intervalMs: parseInt(process.env.CYBERMESH_INTERVAL_MS ?? '5000', 10),
    hostId: process.env.CYBERMESH_HOST_ID ?? hostname(),
    tenantId: process.env.CYBERMESH_TENANT_ID ?? 'tum-sovereign-tenant',
    once: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--endpoint' || arg === '-e') {
      result.endpoint = args[++i] ?? result.endpoint;
    } else if (arg === '--interval' || arg === '-i') {
      result.intervalMs = parseInt(args[++i] ?? '5000', 10);
    } else if (arg === '--host' || arg === '-h') {
      result.hostId = args[++i] ?? result.hostId;
    } else if (arg === '--tenant' || arg === '-t') {
      result.tenantId = args[++i] ?? result.tenantId;
    } else if (arg === '--once') {
      result.once = true;
    } else if (arg === '--help') {
      result.help = true;
    } else if (arg === '--version' || arg === '-v') {
      result.version = true;
    }
  }

  return result;
}

function printHelp() {
  console.log(`
TUM Sovereign CyberMesh — Standalone Sensor Agent (v1.0.0)
Architecture: Clean Architecture eBPF / Socket Telemetry Forwarder

Usage:
  tum-sensor-agent [options]

Options:
  -e, --endpoint <url>    Target CyberMesh Lakehouse endpoint (default: http://localhost:7799)
  -i, --interval <ms>     Sampling and export interval in milliseconds (default: 5000)
  -h, --host <name>       Endpoint host identifier override (default: system hostname)
  -t, --tenant <id>       Sovereign tenant identifier (default: tum-sovereign-tenant)
      --once              Run single telemetry collection snapshot and exit
  -v, --version           Display binary version
      --help              Display this help message

Environment Variables:
  CYBERMESH_ENDPOINT      Override default endpoint URL
  CYBERMESH_INTERVAL_MS   Override default collection interval
  CYBERMESH_HOST_ID       Override default host identifier
  CYBERMESH_TENANT_ID     Override default tenant ID
`);
}

async function main() {
  const cliArgs = parseArgs(process.argv.slice(2));

  if (cliArgs.version) {
    console.log('tum-sensor-agent v1.0.0 (Clean Architecture, Sovereign Enterprise Edition)');
    return;
  }

  if (cliArgs.help) {
    printHelp();
    return;
  }

  console.log('[AGENT] TUM Sovereign CyberMesh Standalone Sensor Agent');
  console.log(`[AGENT] Platform: ${process.platform} | Host: ${cliArgs.hostId} | Tenant: ${cliArgs.tenantId}`);
  console.log(`[AGENT] Lakehouse Ingestion Target: ${cliArgs.endpoint}`);

  const collector = OsSocketCollectorFactory.create();
  const exporter = new HttpLakehouseExporter({ endpointUrl: cliArgs.endpoint });
  const daemon = new SensorAgentDaemonService(collector, exporter, {
    hostId: cliArgs.hostId,
    tenantId: cliArgs.tenantId,
    pollIntervalMs: cliArgs.intervalMs,
  });

  if (cliArgs.once) {
    console.log('[AGENT] Running single-shot socket collection...');
    const result = await daemon.collectAndDispatch();
    console.log(`[AGENT] Sampled: ${result.sampled.length} active sockets`);
    console.log(`[AGENT] Dispatched: ${result.eventsDispatched.length} telemetry events`);
    console.log(`[AGENT] Suspicious sockets flagged: ${result.suspiciousCount}`);

    if (result.sampled.length > 0) {
      console.log('\nActive Sockets Snapshot (Top 10):');
      const preview = result.sampled.slice(0, 10);
      for (const s of preview) {
        const flag = s.isSuspicious().suspicious ? '[SUSPICIOUS]' : '[OK]';
        console.log(`  ${flag} ${s.protocol} ${s.localAddress}:${s.localPort} -> ${s.remoteAddress}:${s.remotePort} (PID: ${s.pid}, ${s.processName}, State: ${s.state})`);
      }
    }
    return;
  }

  console.log(`[AGENT] Starting autonomous telemetry daemon (interval: ${cliArgs.intervalMs}ms)...`);
  await daemon.start();

  const shutdown = async () => {
    console.log('\n[AGENT] Shutdown signal received. Flushing buffers...');
    await daemon.stop();
    console.log('[AGENT] Sensor agent stopped cleanly.');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (process.argv[1] && (process.argv[1].endsWith('sensor-agent-cli.ts') || process.argv[1].endsWith('sensor-agent-cli.js') || process.argv[1].includes('tum-sensor-agent'))) {
  main().catch((err) => {
    console.error('[AGENT] Fatal error:', err);
    process.exit(1);
  });
}

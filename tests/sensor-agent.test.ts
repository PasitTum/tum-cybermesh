import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SocketTelemetryEntity } from '../src/domain/sensor/entities/socket-telemetry.entity.js';
import { LinuxProcfsSocketCollector } from '../src/infrastructure/sensor/linux-procfs-socket-collector.js';
import { WindowsNetSocketCollector } from '../src/infrastructure/sensor/windows-net-socket-collector.js';
import { SensorAgentDaemonService } from '../src/application/sensor/sensor-agent-daemon.service.js';
import { ISocketCollector } from '../src/domain/sensor/ports/socket-collector.port.js';
import { ITelemetryExporter, TelemetryExportResult } from '../src/domain/sensor/ports/telemetry-exporter.port.js';
import { TelemetryEvent } from '../src/domain/telemetry/entities/telemetry-event.entity.js';

describe('Standalone Sensor Agent (eBPF Socket Telemetry)', () => {
  it('SocketTelemetryEntity: flags suspicious C2 and reverse shell ports', () => {
    const maliciousSocket = new SocketTelemetryEntity({
      connectionId: 'c2-test-01',
      timestamp: new Date().toISOString(),
      protocol: 'TCP',
      localAddress: '10.0.4.15',
      localPort: 54322,
      remoteAddress: '198.51.100.89',
      remotePort: 4444, // Known Metasploit reverse shell port
      state: 'ESTABLISHED',
      pid: 8841,
      processName: 'bash',
      hostId: 'prod-server-01',
      tenantId: 'tum-sovereign',
    });

    const check = maliciousSocket.isSuspicious();
    assert.equal(check.suspicious, true);
    assert.equal(check.severity, 'CRITICAL');

    const event = maliciousSocket.toTelemetryEvent();
    assert.equal(event.category, 'SOCKET_CONNECT');
    assert.equal(event.severity, 'CRITICAL');
    assert.ok(event.action.includes('SUSPICIOUS_SOCKET_ALERT'));
  });

  it('SocketTelemetryEntity: benign connections remain INFORMATIONAL', () => {
    const benignSocket = new SocketTelemetryEntity({
      connectionId: 'benign-test-01',
      timestamp: new Date().toISOString(),
      protocol: 'TCP',
      localAddress: '10.0.4.15',
      localPort: 51234,
      remoteAddress: '10.0.0.1',
      remotePort: 443,
      state: 'ESTABLISHED',
      pid: 1200,
      processName: 'curl',
      hostId: 'prod-server-01',
      tenantId: 'tum-sovereign',
    });

    const check = benignSocket.isSuspicious();
    assert.equal(check.suspicious, false);
    assert.equal(check.severity, 'INFORMATIONAL');

    const event = benignSocket.toTelemetryEvent();
    assert.equal(event.severity, 'INFORMATIONAL');
    assert.ok(event.action.startsWith('SOCKET_ESTABLISHED'));
  });

  it('LinuxProcfsSocketCollector: parses hex IP/port and procfs TCP tables', () => {
    const collector = new LinuxProcfsSocketCollector();

    // 0100007F:0050 -> 127.0.0.1:80
    assert.equal(LinuxProcfsSocketCollector.parseHexIpv4('0100007F'), '127.0.0.1');
    assert.equal(LinuxProcfsSocketCollector.parseHexPort('0050'), 80);

    // Mock /proc/net/tcp output:
    // row 1: 127.0.0.1:80 (LISTEN)
    // row 2: 10.0.4.15 (0F04000A):54322 (D432) -> 198.51.100.89 (596433C6):4444 (115C) (ESTABLISHED, state 01)
    const mockProcNetTcp = `  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode
   0: 0100007F:0050 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 91823 1 0000000000000000 100 0 0 10 0
   1: 0F04000A:D432 596433C6:115C 01 00000000:00000000 00:00000000 00000000     0        0 91824 1 0000000000000000 100 0 0 10 0`;

    const mockInodeMap = new Map<number, { pid: number; comm: string; cmdline?: string }>([
      [91823, { pid: 101, comm: 'nginx', cmdline: 'nginx -g daemon off;' }],
      [91824, { pid: 9912, comm: 'bash', cmdline: 'bash -i' }],
    ]);

    const sockets = collector.parseProcNetTcpContent(mockProcNetTcp, 'linux-test-host', 'tum-tenant', mockInodeMap);
    assert.equal(sockets.length, 2);

    // First socket: LISTEN on 127.0.0.1:80
    assert.equal(sockets[0].localAddress, '127.0.0.1');
    assert.equal(sockets[0].localPort, 80);
    assert.equal(sockets[0].state, 'LISTEN');
    assert.equal(sockets[0].pid, 101);
    assert.equal(sockets[0].processName, 'nginx');

    // Second socket: ESTABLISHED on remote port 4444
    assert.equal(sockets[1].remoteAddress, '198.51.100.89');
    assert.equal(sockets[1].remotePort, 4444);
    assert.equal(sockets[1].state, 'ESTABLISHED');
    assert.equal(sockets[1].pid, 9912);
    assert.equal(sockets[1].processName, 'bash');
    assert.equal(sockets[1].isSuspicious().suspicious, true);
  });

  it('WindowsNetSocketCollector: parses standard Windows netstat output', () => {
    const collector = new WindowsNetSocketCollector();

    const mockNetstat = `Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       884
  TCP    10.0.4.15:51234        198.51.100.89:4444     ESTABLISHED     4912
  TCP    127.0.0.1:7799         0.0.0.0:0              LISTENING       12340`;

    const mockProcessMap = new Map<number, string>([
      [884, 'svchost.exe'],
      [4912, 'powershell.exe'],
      [12340, 'node.exe'],
    ]);

    const sockets = collector.parseNetstatOutput(mockNetstat, 'win-test-host', 'tum-tenant', mockProcessMap);
    assert.equal(sockets.length, 3);

    assert.equal(sockets[0].localPort, 135);
    assert.equal(sockets[0].state, 'LISTEN');
    assert.equal(sockets[0].processName, 'svchost.exe');

    assert.equal(sockets[1].remoteAddress, '198.51.100.89');
    assert.equal(sockets[1].remotePort, 4444);
    assert.equal(sockets[1].state, 'ESTABLISHED');
    assert.equal(sockets[1].processName, 'powershell.exe');
    assert.equal(sockets[1].isSuspicious().suspicious, true);
  });

  it('SensorAgentDaemonService: tracks differential state and raises alerts', async () => {
    let mockSockets: SocketTelemetryEntity[] = [
      new SocketTelemetryEntity({
        connectionId: 'conn-1',
        timestamp: new Date().toISOString(),
        protocol: 'TCP',
        localAddress: '10.0.0.5',
        localPort: 80,
        remoteAddress: '0.0.0.0',
        remotePort: 0,
        state: 'LISTEN',
        pid: 500,
        processName: 'httpd',
        hostId: 'srv-01',
        tenantId: 'tum',
      }),
    ];

    const mockCollector: ISocketCollector = {
      collectSockets: async () => mockSockets,
      getPlatform: () => 'linux',
      isAvailable: async () => true,
    };

    const exportedBatches: TelemetryEvent[][] = [];
    const mockExporter: ITelemetryExporter = {
      exportTelemetry: async (events: TelemetryEvent[]): Promise<TelemetryExportResult> => {
        exportedBatches.push(events);
        return { success: true, exportedCount: events.length, failedCount: 0, latencyMs: 2 };
      },
      flush: async () => {},
      close: async () => {},
    };

    const daemon = new SensorAgentDaemonService(mockCollector, mockExporter, {
      hostId: 'srv-01',
      tenantId: 'tum',
      pollIntervalMs: 100,
    });

    // Pass 1: Initial snapshot
    const pass1 = await daemon.collectAndDispatch();
    assert.equal(pass1.sampled.length, 1);
    assert.equal(pass1.eventsDispatched.length, 1);
    assert.equal(exportedBatches.length, 1);

    // Pass 2: No changes, should not re-dispatch existing stable benign socket
    const pass2 = await daemon.collectAndDispatch();
    assert.equal(pass2.eventsDispatched.length, 0);

    // Pass 3: New suspicious C2 connection appears
    mockSockets = [
      mockSockets[0],
      new SocketTelemetryEntity({
        connectionId: 'conn-c2',
        timestamp: new Date().toISOString(),
        protocol: 'TCP',
        localAddress: '10.0.0.5',
        localPort: 49122,
        remoteAddress: '198.51.100.89',
        remotePort: 4444,
        state: 'ESTABLISHED',
        pid: 991,
        processName: 'nc',
        hostId: 'srv-01',
        tenantId: 'tum',
      }),
    ];

    const pass3 = await daemon.collectAndDispatch();
    assert.equal(pass3.eventsDispatched.length, 1);
    assert.equal(pass3.suspiciousCount, 1);
    assert.ok(pass3.eventsDispatched[0].action.includes('SUSPICIOUS_SOCKET_ALERT'));

    // Heartbeat check
    await daemon.emitHeartbeat();
    const lastBatch = exportedBatches[exportedBatches.length - 1];
    assert.equal(lastBatch[0].action, 'SENSOR_AGENT_HEARTBEAT');

    const metrics = daemon.getMetrics();
    assert.equal(metrics.cyclesRun, 3);
    assert.equal(metrics.totalSuspiciousDetected, 1);
  });
});

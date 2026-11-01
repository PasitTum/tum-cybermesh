import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

import { TelemetryStreamHub, StreamSubscriber } from '../src/infrastructure/streaming/telemetry-stream-hub.js';
import { TelemetryEvent } from '../src/domain/telemetry/entities/telemetry-event.entity.js';

class MockServerResponse extends EventEmitter {
  public headers: Record<string, string> = {};
  public statusCode: number = 0;
  public writtenData: string[] = [];
  public closed: boolean = false;

  public writeHead(statusCode: number, headers: Record<string, string>): void {
    this.statusCode = statusCode;
    this.headers = headers;
  }

  public write(chunk: string): boolean {
    this.writtenData.push(chunk);
    return true;
  }

  public end(): void {
    this.closed = true;
    this.emit('close');
  }
}

describe('TelemetryStreamHub (Real-Time SSE Streaming)', () => {
  it('registers subscribers, sends connected handshake, and broadcasts matching events', () => {
    const hub = new TelemetryStreamHub();
    const mockRes = new MockServerResponse();

    const subscriber: StreamSubscriber = {
      id: 'sub-test-01',
      response: mockRes as any,
      minSeverity: 'HIGH',
    };

    hub.register(subscriber);
    assert.equal(hub.getActiveSubscriberCount(), 1);
    assert.equal(mockRes.statusCode, 200);
    assert.ok(mockRes.writtenData[0].includes('event: connected'));

    // 1. Broadcast informational event (should be filtered out by minSeverity: HIGH)
    const lowEvent = new TelemetryEvent({
      id: 'ev-low',
      timestamp: new Date().toISOString(),
      sourceHost: 'host-a',
      tenantId: 'tenant-1',
      category: 'KERNEL_SYSCALL',
      severity: 'INFORMATIONAL',
      action: 'SYS_READ',
      metadata: {},
    });
    const sentLow = hub.broadcast(lowEvent);
    assert.equal(sentLow, 0);

    // 2. Broadcast critical event (should be dispatched to subscriber)
    const critEvent = new TelemetryEvent({
      id: 'ev-crit',
      timestamp: new Date().toISOString(),
      sourceHost: 'host-a',
      tenantId: 'tenant-1',
      category: 'SOCKET_CONNECT',
      severity: 'CRITICAL',
      action: 'REVERSE_SHELL',
      metadata: {},
    });
    const sentCrit = hub.broadcast(critEvent);
    assert.equal(sentCrit, 1);
    assert.ok(mockRes.writtenData.some((c) => c.includes('REVERSE_SHELL')));

    hub.dispose();
  });

  it('unregisters subscriber on connection close', () => {
    const hub = new TelemetryStreamHub();
    const mockRes = new MockServerResponse();

    hub.register({
      id: 'sub-close-test',
      response: mockRes as any,
    });
    assert.equal(hub.getActiveSubscriberCount(), 1);

    mockRes.end();
    assert.equal(hub.getActiveSubscriberCount(), 0);

    hub.dispose();
  });
});

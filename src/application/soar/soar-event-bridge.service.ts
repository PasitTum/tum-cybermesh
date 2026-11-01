/**
 * TUM CyberMesh — SOAR Cross-Fleet Event Bridge
 * Application Service for dispatching containment events to Central Director Event Mesh
 */

import { PlaybookExecutionRecord } from '../../domain/soar/soar-playbook.types.js';

export interface FleetBridgeDispatchEvent {
  readonly eventId: string;
  readonly topic: 'CYBERMESH_SOAR_CONTAINMENT';
  readonly sourceRepo: 'tum-cybermesh';
  readonly timestamp: string;
  readonly payload: {
    readonly executionId: string;
    readonly playbookId: string;
    readonly incidentId: string;
    readonly technique: string;
    readonly containmentStatus: 'COMPLETED' | 'FAILED' | 'PARTIAL_ROLLBACK';
    readonly withinSla: boolean;
    readonly quantumSignature: string;
  };
}

export class SoarEventBridgeService {
  private dispatchedEvents: FleetBridgeDispatchEvent[] = [];

  public createFleetEvent(record: PlaybookExecutionRecord): FleetBridgeDispatchEvent {
    const event: FleetBridgeDispatchEvent = {
      eventId: `FLEET-EVT-${record.executionId}`,
      topic: 'CYBERMESH_SOAR_CONTAINMENT',
      sourceRepo: 'tum-cybermesh',
      timestamp: new Date().toISOString(),
      payload: {
        executionId: record.executionId,
        playbookId: record.playbookId,
        incidentId: record.incidentId,
        technique: record.targetTechnique,
        containmentStatus: record.status,
        withinSla: record.withinSla,
        quantumSignature: record.quantumSignature
      }
    };

    this.dispatchedEvents.push(event);
    return event;
  }

  public getDispatchedEvents(): readonly FleetBridgeDispatchEvent[] {
    return [...this.dispatchedEvents];
  }
}

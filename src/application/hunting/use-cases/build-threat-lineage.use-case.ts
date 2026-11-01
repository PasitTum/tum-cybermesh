import { TelemetryEvent } from '../../../domain/telemetry/entities/telemetry-event.entity.js';
import { ThreatLineageGraph, LineageNode, LineageEdge } from '../../../domain/hunting/entities/threat-lineage-graph.entity.js';

export class BuildThreatLineageUseCase {
  public execute(events: TelemetryEvent[]): ThreatLineageGraph {
    const graph = new ThreatLineageGraph();

    for (const event of events) {
      const pid = event.metadata.pid as number | undefined;
      const ppid = event.metadata.ppid as number | undefined;
      const processName = (event.metadata.processName as string | undefined) ?? 'unknown_process';
      const sourceIp = event.metadata.sourceIp as string | undefined;
      const destinationIp = event.metadata.destinationIp as string | undefined;
      const user = (event.metadata.user as string | undefined) ?? 'system';

      // 1. Process node
      let processNodeId: string | undefined;
      if (pid) {
        processNodeId = `proc-${pid}`;
        const existingNode = graph.getNode(processNodeId);
        const resolvedName = event.metadata.processName
          ? String(event.metadata.processName)
          : (existingNode?.properties.processName as string | undefined) ?? 'unknown_process';

        graph.addNode({
          id: processNodeId,
          type: 'PROCESS',
          label: `${resolvedName} (PID:${pid})`,
          properties: {
            pid,
            ppid: ppid ?? existingNode?.properties.ppid,
            processName: resolvedName,
            user: user !== 'system' ? user : (existingNode?.properties.user as string | undefined) ?? user,
          },
          timestamp: event.timestamp,
        });

        // 2. Parent-child process edge
        if (ppid && ppid !== 0 && ppid !== pid) {
          const parentNodeId = `proc-${ppid}`;
          if (!graph.getNode(parentNodeId)) {
            graph.addNode({
              id: parentNodeId,
              type: 'PROCESS',
              label: `Parent (PID:${ppid})`,
              properties: { pid: ppid },
              timestamp: event.timestamp,
            });
          }

          graph.addEdge({
            sourceId: parentNodeId,
            targetId: processNodeId,
            relation: 'SPAWNED',
            timestamp: event.timestamp,
          });
        }
      }

      // 3. Socket node
      if (destinationIp || sourceIp) {
        const ip = destinationIp ?? sourceIp!;
        const socketNodeId = `sock-${ip}`;
        graph.addNode({
          id: socketNodeId,
          type: 'SOCKET',
          label: `Socket ${ip}`,
          properties: { ip, destinationIp, sourceIp },
          timestamp: event.timestamp,
        });

        if (processNodeId) {
          graph.addEdge({
            sourceId: processNodeId,
            targetId: socketNodeId,
            relation: 'CONNECTED',
            timestamp: event.timestamp,
          });
        }
      }

      // 4. Canary / Honeytoken node
      if (event.action.toLowerCase().includes('canary') || event.action.toLowerCase().includes('honeytoken')) {
        const tokenId = (event.metadata.tokenId as string | undefined) ?? 'canary_trap';
        const canaryNodeId = `canary-${tokenId}`;
        graph.addNode({
          id: canaryNodeId,
          type: 'CANARY_TOKEN',
          label: `Honeytoken (${tokenId})`,
          properties: { tokenId },
          timestamp: event.timestamp,
        });

        if (processNodeId) {
          graph.addEdge({
            sourceId: processNodeId,
            targetId: canaryNodeId,
            relation: 'TARGETED',
            timestamp: event.timestamp,
          });
        }
      }
    }

    return graph;
  }
}

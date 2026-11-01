export type LineageNodeType = 'PROCESS' | 'SOCKET' | 'FILE' | 'USER' | 'CANARY_TOKEN' | 'CONTAINMENT_ACTION';
export type LineageEdgeType = 'SPAWNED' | 'CONNECTED' | 'MODIFIED' | 'AUTHENTICATED' | 'TARGETED' | 'CONTAINED';

export interface LineageNode {
  id: string;
  type: LineageNodeType;
  label: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

export interface LineageEdge {
  sourceId: string;
  targetId: string;
  relation: LineageEdgeType;
  timestamp: string;
}

export class ThreatLineageGraph {
  private readonly nodes: Map<string, LineageNode> = new Map();
  private readonly edges: LineageEdge[] = [];

  public addNode(node: LineageNode): void {
    this.nodes.set(node.id, node);
  }

  public addEdge(edge: LineageEdge): void {
    this.edges.push(edge);
  }

  public getNode(id: string): LineageNode | undefined {
    return this.nodes.get(id);
  }

  public getAllNodes(): LineageNode[] {
    return Array.from(this.nodes.values());
  }

  public getAllEdges(): LineageEdge[] {
    return [...this.edges];
  }

  public findRootCause(targetNodeId: string): LineageNode[] {
    const visited = new Set<string>();
    const roots: LineageNode[] = [];

    const traceUpward = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      // Find incoming edges (who spawned or targeted this)
      const incoming = this.edges.filter((e) => e.targetId === nodeId);
      if (incoming.length === 0) {
        const root = this.nodes.get(nodeId);
        if (root) roots.push(root);
      } else {
        for (const edge of incoming) {
          traceUpward(edge.sourceId);
        }
      }
    };

    traceUpward(targetNodeId);
    return roots;
  }

  public findBlastRadius(startNodeId: string): LineageNode[] {
    const visited = new Set<string>();
    const descendants: LineageNode[] = [];

    const traceDownward = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const outgoing = this.edges.filter((e) => e.sourceId === nodeId);
      for (const edge of outgoing) {
        const targetNode = this.nodes.get(edge.targetId);
        if (targetNode && !visited.has(targetNode.id)) {
          descendants.push(targetNode);
          traceDownward(targetNode.id);
        }
      }
    };

    traceDownward(startNodeId);
    return descendants;
  }
}

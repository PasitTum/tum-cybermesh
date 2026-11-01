export interface ProcessNodeProps {
  pid: number;
  ppid: number;
  name: string;
  commandLine: string;
  startTime: string;
  user: string;
  children?: ProcessNodeProps[];
}

export class ProcessTree {
  private readonly nodes: Map<number, ProcessNodeProps> = new Map();

  constructor(initialNodes: ProcessNodeProps[] = []) {
    for (const node of initialNodes) {
      this.addNode(node);
    }
  }

  public addNode(node: ProcessNodeProps): void {
    this.nodes.set(node.pid, { ...node, children: node.children ?? [] });
  }

  public getNode(pid: number): ProcessNodeProps | undefined {
    return this.nodes.get(pid);
  }

  public getAncestry(pid: number): ProcessNodeProps[] {
    const ancestry: ProcessNodeProps[] = [];
    let currentPid: number | undefined = pid;
    const visited = new Set<number>();

    while (currentPid !== undefined && !visited.has(currentPid)) {
      visited.add(currentPid);
      const node = this.nodes.get(currentPid);
      if (!node) break;
      ancestry.push(node);
      if (node.ppid === 0 || node.ppid === currentPid) break;
      currentPid = node.ppid;
    }

    return ancestry;
  }

  public getDescendants(pid: number): ProcessNodeProps[] {
    const descendants: ProcessNodeProps[] = [];
    for (const node of this.nodes.values()) {
      if (node.ppid === pid) {
        descendants.push(node);
        descendants.push(...this.getDescendants(node.pid));
      }
    }
    return descendants;
  }

  public getAllPids(): number[] {
    return Array.from(this.nodes.keys());
  }
}

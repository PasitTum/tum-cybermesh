import { ThreatLineageGraph, LineageNode } from '../../../domain/hunting/entities/threat-lineage-graph.entity.js';

export interface HuntFinding {
  findingId: string;
  type: 'LIVING_OFF_THE_LAND' | 'PRIVILEGE_ESCALATION_LEAP' | 'REVERSE_SHELL_CHAIN' | 'CANARY_ACCESS_ORIGIN';
  severity: 'HIGH' | 'CRITICAL';
  rootCauseNode: LineageNode;
  impactedNodes: LineageNode[];
  summary: string;
}

export class HuntAnomalousLineageUseCase {
  private readonly lotlBinaries = new Set([
    'powershell.exe',
    'cmd.exe',
    'bash',
    'sh',
    'wmic.exe',
    'certutil.exe',
    'curl',
    'wget',
    'netcat',
    'nc',
  ]);

  public execute(graph: ThreatLineageGraph): HuntFinding[] {
    const findings: HuntFinding[] = [];
    const allNodes = graph.getAllNodes();

    // 1. Hunt for Living-off-the-Land (LotL) binaries making socket connections
    for (const node of allNodes) {
      if (node.type === 'PROCESS') {
        const procName = String(node.properties.processName ?? '').toLowerCase();
        if (this.lotlBinaries.has(procName)) {
          const blastRadius = graph.findBlastRadius(node.id);
          const socketConnection = blastRadius.find((n) => n.type === 'SOCKET');
          if (socketConnection) {
            findings.push({
              findingId: `hunt-lotl-${Date.now()}-${node.id}`,
              type: 'LIVING_OFF_THE_LAND',
              severity: 'HIGH',
              rootCauseNode: node,
              impactedNodes: blastRadius,
              summary: `Dual-use binary ${procName} established external socket connection (${socketConnection.label})`,
            });
          }
        }
      }

      // 2. Hunt for Honeytoken access origins
      if (node.type === 'CANARY_TOKEN') {
        const rootCauses = graph.findRootCause(node.id);
        const culprit = rootCauses[0] ?? node;
        const blast = graph.findBlastRadius(culprit.id);

        findings.push({
          findingId: `hunt-canary-${Date.now()}-${node.id}`,
          type: 'CANARY_ACCESS_ORIGIN',
          severity: 'CRITICAL',
          rootCauseNode: culprit,
          impactedNodes: blast,
          summary: `Deceptive trap (${node.label}) breached by ancestor lineage originating at ${culprit.label}`,
        });
      }
    }

    return findings;
  }
}

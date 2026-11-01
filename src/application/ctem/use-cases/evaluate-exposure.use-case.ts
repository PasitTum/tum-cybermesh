import { ExposureScore } from '../../../domain/ctem/value-objects/exposure-score.vo.js';
import { ThreatExposure } from '../../../domain/ctem/entities/threat-exposure.entity.js';
import { ExecuteAutoRedTeamUseCase } from './execute-auto-red-team.use-case.js';
import { AssetEvaluationTarget, CtemEvaluationReport } from '../dtos/ctem-report.dto.js';

export class EvaluateExposureUseCase {
  constructor(private readonly redTeamUseCase: ExecuteAutoRedTeamUseCase) {}

  public execute(target: AssetEvaluationTarget): { exposure: ThreatExposure; report: CtemEvaluationReport } {
    const probes = this.redTeamUseCase.execute(target);
    const remediationPlan: string[] = [];

    let rawScore = 10; // Baseline low risk

    // CVE penalty
    if (target.cveList.length > 0) {
      rawScore += Math.min(target.cveList.length * 15, 45);
      remediationPlan.push(`Patch ${target.cveList.length} known CVEs immediately: ${target.cveList.join(', ')}`);
    }

    // Exposed port penalty
    const exposedManagementPorts = target.openPorts.filter((p) => [22, 3389, 445, 8080].includes(p));
    if (exposedManagementPorts.length > 0) {
      rawScore += exposedManagementPorts.length * 8;
      remediationPlan.push(`Restrict external ingress on sensitive ports: [${exposedManagementPorts.join(', ')}] via eBPF firewall`);
    }

    // Probe failure penalty
    const failedProbes = probes.filter((p) => p.isDefenseDeficiency());
    if (failedProbes.length > 0) {
      rawScore += failedProbes.length * 15;
      remediationPlan.push(`Remediate ${failedProbes.length} automated red-team breach paths detected during simulation`);
    }

    const finalScore = Math.min(Math.max(rawScore, 0), 100);
    const exposureScore = new ExposureScore(finalScore);

    const exposure = new ThreatExposure({
      id: `exp-${Date.now()}-${target.assetIdentifier}`,
      tenantId: target.tenantId,
      assetIdentifier: target.assetIdentifier,
      assetType: target.assetType,
      cveList: target.cveList,
      exposureScore,
      probes,
      remediationPlan,
      lastEvaluatedAt: new Date().toISOString(),
    });

    const report: CtemEvaluationReport = {
      assetIdentifier: target.assetIdentifier,
      exposureScore: exposureScore.score,
      riskLevel: exposureScore.riskLevel,
      criticalVulnerabilitiesCount: target.cveList.length,
      unmitigatedProbesCount: failedProbes.length,
      probes,
      remediationPlan,
      evaluatedAt: exposure.lastEvaluatedAt,
    };

    return { exposure, report };
  }
}

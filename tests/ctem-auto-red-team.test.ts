import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ExecuteAutoRedTeamUseCase } from '../src/application/ctem/use-cases/execute-auto-red-team.use-case.js';
import { EvaluateExposureUseCase } from '../src/application/ctem/use-cases/evaluate-exposure.use-case.js';

describe('Continuous Threat Exposure Management (CTEM) & Auto-Red Teaming', () => {
  it('should simulate automated red-team probes against target attack surface', () => {
    const redTeam = new ExecuteAutoRedTeamUseCase();

    const probes = redTeam.execute({
      tenantId: 'tum-sovereign',
      assetIdentifier: 'gateway-cluster',
      assetType: 'CLUSTER',
      openPorts: [443, 22],
      detectedServices: ['nginx', 'ssh'],
      cveList: ['CVE-2024-3094'],
      authProtocols: ['OIDC_PKCE'],
    });

    assert.equal(probes.length, 4);
    assert.ok(probes.some((p) => p.probeType === 'CREDENTIAL_STUFFING_SIM'));
    assert.ok(probes.some((p) => p.probeType === 'PRIVILEGE_ESCALATION_PROBE'));
    assert.ok(probes.some((p) => p.probeType === 'LATERAL_MOVEMENT_SIM'));
  });

  it('should score asset exposure and output actionable remediation plan', () => {
    const ctem = new EvaluateExposureUseCase(new ExecuteAutoRedTeamUseCase());

    const { exposure, report } = ctem.execute({
      tenantId: 'tum-sovereign',
      assetIdentifier: 'legacy-api-box',
      assetType: 'HOST',
      openPorts: [80, 22, 3389],
      detectedServices: ['rdp', 'ssh'],
      cveList: ['CVE-2023-38606', 'CVE-2024-1123'],
      authProtocols: ['LEGACY_PASSWORD'],
    });

    assert.ok(exposure.exposureScore.score >= 40);
    assert.equal(report.criticalVulnerabilitiesCount, 2);
    assert.ok(report.remediationPlan.length >= 2);
    assert.ok(report.remediationPlan.some((r) => r.includes('CVE')));
  });
});

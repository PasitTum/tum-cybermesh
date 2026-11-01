export type AnalystTier = 'TIER_1_TRIAGE' | 'TIER_2_INVESTIGATION' | 'TIER_3_SOVEREIGN_COMMAND';

export interface AnalystTierCapability {
  tier: AnalystTier;
  maxSlaSeconds: number;
  canExecuteContainment: boolean;
  canQuarantineHost: boolean;
  canInjectKernelFirewallRule: boolean;
}

export const ANALYST_CAPABILITIES: Record<AnalystTier, AnalystTierCapability> = {
  TIER_1_TRIAGE: {
    tier: 'TIER_1_TRIAGE',
    maxSlaSeconds: 15,
    canExecuteContainment: false,
    canQuarantineHost: false,
    canInjectKernelFirewallRule: false,
  },
  TIER_2_INVESTIGATION: {
    tier: 'TIER_2_INVESTIGATION',
    maxSlaSeconds: 30, // 30s containment target DoD
    canExecuteContainment: true,
    canQuarantineHost: true,
    canInjectKernelFirewallRule: true,
  },
  TIER_3_SOVEREIGN_COMMAND: {
    tier: 'TIER_3_SOVEREIGN_COMMAND',
    maxSlaSeconds: 60,
    canExecuteContainment: true,
    canQuarantineHost: true,
    canInjectKernelFirewallRule: true,
  },
};

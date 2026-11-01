export type SigmaLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SigmaLogSource {
  category?: string;
  product?: string;
  service?: string;
}

export interface SigmaRuleDefinition {
  id: string;
  title: string;
  status: 'experimental' | 'test' | 'stable';
  description: string;
  logsource: SigmaLogSource;
  detection: {
    condition: string; // e.g. "selection and not filter"
    [key: string]: unknown;
  };
  level: SigmaLevel;
  tags?: string[]; // e.g. ["attack.credential_access", "attack.t1003.001"]
}

export interface SigmaMatchResult {
  ruleId: string;
  ruleTitle: string;
  level: SigmaLevel;
  matched: boolean;
  matchedFields: Record<string, unknown>;
  mitreTags: string[];
}

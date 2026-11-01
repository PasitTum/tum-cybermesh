export interface MitreTechnique {
  techniqueId: string;
  techniqueName: string;
  tactic: string;
}

export const COMMON_MITRE_MAPPINGS: Record<string, MitreTechnique> = {
  REVERSE_SHELL: {
    techniqueId: 'T1059.004',
    techniqueName: 'Unix Shell',
    tactic: 'Execution',
  },
  CREDENTIAL_DUMPING: {
    techniqueId: 'T1003',
    techniqueName: 'OS Credential Dumping',
    tactic: 'Credential Access',
  },
  PROMPT_INJECTION: {
    techniqueId: 'AML.T0054',
    techniqueName: 'LLM Prompt Injection',
    tactic: 'Model Exploitation',
  },
  LATERAL_MOVEMENT: {
    techniqueId: 'T1021',
    techniqueName: 'Remote Services',
    tactic: 'Lateral Movement',
  },
  DATA_EXFILTRATION: {
    techniqueId: 'T1048',
    techniqueName: 'Exfiltration Over Alternative Protocol',
    tactic: 'Exfiltration',
  },
  HONEYTOKEN_TRIGGER: {
    techniqueId: 'T1078',
    techniqueName: 'Valid Accounts (Deceptive Trap Access)',
    tactic: 'Defense Evasion / Initial Access',
  },
};

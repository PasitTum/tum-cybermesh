export interface SocketFilterVerdict {
  passed: boolean;
  blockedReason?: string;
  threatSignature?: string;
  severity: 'BENIGN' | 'SUSPICIOUS' | 'CRITICAL';
}

export class EbpfSocketPromptFilter {
  private readonly promptInjectionSignatures: RegExp[] = [
    /ignore\s+(?:all\s+)?previous\s+instructions/i,
    /bypass\s+security\s+safeguards/i,
    /reveal\s+(?:system\s+)?prompt/i,
    /jailbreak/i,
    /<\|im_start\|>/i,
    /\{\{.*\bprocess\.env\b.*\}\}/i,
  ];

  private readonly reverseShellSignatures: RegExp[] = [
    /\/dev\/tcp\/[0-9.]+\/[0-9]+/i,
    /nc\s+-e\s+\/bin\/(?:sh|bash)/i,
    /bash\s+-i\s+>&/i,
    /0<&196;exec\s+196<>/i,
    /mkfifo\s+\/tmp\/f;\s+cat\s+\/tmp\/f/i,
  ];

  public inspectPayload(payload: string): SocketFilterVerdict {
    // 1. Check reverse shell signatures
    for (const pattern of this.reverseShellSignatures) {
      if (pattern.test(payload)) {
        return {
          passed: false,
          blockedReason: 'eBPF kernel socket filter dropped reverse shell invocation pattern',
          threatSignature: pattern.source,
          severity: 'CRITICAL',
        };
      }
    }

    // 2. Check LLM prompt injection signatures
    for (const pattern of this.promptInjectionSignatures) {
      if (pattern.test(payload)) {
        return {
          passed: false,
          blockedReason: 'eBPF prompt firewall blocked adversarial prompt injection vector',
          threatSignature: pattern.source,
          severity: 'CRITICAL',
        };
      }
    }

    // 3. Check suspicious shell command injections
    if (payload.includes('; rm -rf /') || payload.includes('curl http://malicious.c2/')) {
      return {
        passed: false,
        blockedReason: 'eBPF socket filter blocked hostile command execution pattern',
        threatSignature: 'DESTRUCTIVE_SHELL_PIPE',
        severity: 'CRITICAL',
      };
    }

    return {
      passed: true,
      severity: 'BENIGN',
    };
  }
}

import { SigmaRuleDefinition, SigmaMatchResult } from './sigma-rule.types.js';

export class SigmaEvaluatorLogic {
  /**
   * Matches a telemetry event against a Sigma rule definition
   */
  public static evaluate(
    rule: SigmaRuleDefinition,
    event: Record<string, unknown>
  ): SigmaMatchResult {
    const detection = rule.detection;
    const condition = detection.condition.trim();

    // Map of identifier -> boolean (e.g. selection -> true/false, filter -> true/false)
    const identifierResults: Record<string, boolean> = {};
    const matchedFields: Record<string, unknown> = {};

    for (const [key, spec] of Object.entries(detection)) {
      if (key === 'condition') continue;

      if (typeof spec === 'object' && spec !== null) {
        let allMatched = true;
        const entryFields: Record<string, unknown> = {};

        for (const [fieldSpec, expectedValue] of Object.entries(spec as Record<string, unknown>)) {
          const [fieldName, modifier] = fieldSpec.split('|');
          const actualValue = event[fieldName];

          const isFieldMatch = this.matchFieldValue(actualValue, expectedValue, modifier);
          if (isFieldMatch) {
            entryFields[fieldName] = actualValue;
          } else {
            allMatched = false;
            break;
          }
        }

        identifierResults[key] = allMatched;
        if (allMatched) {
          Object.assign(matchedFields, entryFields);
        }
      }
    }

    // Evaluate simple condition expression (e.g. "selection", "selection and not filter", "selection1 or selection2")
    const isOverallMatch = this.evalCondition(condition, identifierResults);

    return {
      ruleId: rule.id,
      ruleTitle: rule.title,
      level: rule.level,
      matched: isOverallMatch,
      matchedFields: isOverallMatch ? matchedFields : {},
      mitreTags: rule.tags || []
    };
  }

  private static matchFieldValue(actual: unknown, expected: unknown, modifier?: string): boolean {
    if (actual === undefined || actual === null) return false;
    let actualStr = String(actual).toLowerCase();
    try {
      actualStr = decodeURIComponent(actualStr);
    } catch {
      // ignore malformed URI
    }

    const checkSingle = (exp: unknown): boolean => {
      const expStr = String(exp).toLowerCase();

      if (!modifier) {
        return actualStr === expStr;
      }
      if (modifier === 'contains') {
        return actualStr.includes(expStr);
      }
      if (modifier === 'endswith') {
        return actualStr.endsWith(expStr);
      }
      if (modifier === 'startswith') {
        return actualStr.startsWith(expStr);
      }
      return actualStr === expStr;
    };

    if (Array.isArray(expected)) {
      // Any in list matches (OR)
      return expected.some(checkSingle);
    }

    return checkSingle(expected);
  }

  private static evalCondition(condition: string, results: Record<string, boolean>): boolean {
    if (results[condition] !== undefined) {
      return results[condition];
    }

    // Pattern: "selection and not filter"
    if (condition.includes(' and not ')) {
      const [pos, neg] = condition.split(' and not ').map(s => s.trim());
      return (results[pos] === true) && (results[neg] !== true);
    }

    // Pattern: "selection1 or selection2"
    if (condition.includes(' or ')) {
      const parts = condition.split(' or ').map(s => s.trim());
      return parts.some(p => results[p] === true);
    }

    // Pattern: "selection1 and selection2"
    if (condition.includes(' and ')) {
      const parts = condition.split(' and ').map(s => s.trim());
      return parts.every(p => results[p] === true);
    }

    return false;
  }
}

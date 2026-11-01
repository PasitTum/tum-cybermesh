export type EventSeverity = 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const EventSeverityWeight: Record<EventSeverity, number> = {
  INFORMATIONAL: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export function isSeverityHigherOrEqual(current: EventSeverity, threshold: EventSeverity): boolean {
  return EventSeverityWeight[current] >= EventSeverityWeight[threshold];
}

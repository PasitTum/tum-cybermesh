import { z } from 'zod';

export const TelemetryEventSchema = z.object({
  id: z.string().min(1, 'Event ID is required'),
  timestamp: z.string().datetime({ message: 'Must be ISO 8601 timestamp' }),
  sourceHost: z.string().min(1, 'Source host is required'),
  tenantId: z.string().min(1, 'Tenant ID is required'),
  category: z.enum([
    'KERNEL_SYSCALL',
    'PROCESS_EXECUTION',
    'SOCKET_CONNECT',
    'DNS_QUERY',
    'MEMORY_ALLOCATION',
    'FILE_INTEGRITY',
    'AUTHENTICATION',
    'PQC_ENVELOPE',
  ]),
  severity: z.enum(['INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  action: z.string().min(1, 'Action descriptor is required'),
  metadata: z.record(z.unknown()).default({}),
});

export const IngestTelemetryBatchSchema = z.object({
  events: z.array(TelemetryEventSchema).min(1, 'Batch must contain at least one event'),
  pqcEnvelope: z.string().optional(),
});

export const TelemetryQuerySchema = z.object({
  tenantId: z.string().optional(),
  sourceHost: z.string().optional(),
  severity: z.enum(['INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  category: z.enum([
    'KERNEL_SYSCALL',
    'PROCESS_EXECUTION',
    'SOCKET_CONNECT',
    'DNS_QUERY',
    'MEMORY_ALLOCATION',
    'FILE_INTEGRITY',
    'AUTHENTICATION',
    'PQC_ENVELOPE',
  ]).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  limit: z.number().int().positive().max(10000).default(100),
  offset: z.number().int().min(0).default(0),
});

export type IngestTelemetryBatchInput = z.infer<typeof IngestTelemetryBatchSchema>;
export type TelemetryQueryInput = z.infer<typeof TelemetryQuerySchema>;
export type TelemetryEventInput = z.infer<typeof TelemetryEventSchema>;

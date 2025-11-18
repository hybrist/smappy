import * as v from 'valibot';

const numericIdSchema = v.pipe(
  v.union([v.number(), v.string()]),
  v.transform((value) => (typeof value === 'string' ? Number(value) : value)),
  v.number('Value must be numeric'),
  v.check((value) => Number.isFinite(value), 'Value must be finite'),
);

const analysisSummarySchema = v.object({
  id: v.number(),
  projectName: v.optional(v.string()),
  createdAt: v.optional(v.string()),
  bundler: v.optional(v.string()),
  moduleCount: v.optional(v.number()),
  bundleCount: v.optional(v.number()),
  totalSize: v.optional(v.number()),
  totalGzipSize: v.optional(v.number()),
});

export const chatContextSchema = v.object({
  projectName: v.optional(v.string()),
  analysis: v.optional(analysisSummarySchema),
  analysisId: v.optional(numericIdSchema),
  bundleId: v.optional(numericIdSchema),
});

export const chatRequestSchema = v.object({
  messages: v.array(v.unknown()),
  model: v.optional(v.string()),
  context: v.optional(chatContextSchema),
  analysisId: v.optional(numericIdSchema),
  bundleId: v.optional(numericIdSchema),
});

export type ChatRequestBody = v.InferOutput<typeof chatRequestSchema>;

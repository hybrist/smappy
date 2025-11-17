import * as v from 'valibot';

export const chatStreamEventSchema = v.union([
  v.object({
    type: v.literal('text'),
    content: v.string(),
  }),
  v.object({
    type: v.literal('tool-call'),
    toolCallId: v.string(),
    toolName: v.string(),
    input: v.unknown(),
  }),
  v.object({
    type: v.literal('tool-result'),
    toolCallId: v.string(),
    toolName: v.string(),
    output: v.unknown(),
  }),
  v.object({
    type: v.literal('error'),
    error: v.string(),
  }),
  v.object({
    type: v.literal('done'),
  }),
]);

export type ChatStreamEvent = v.InferOutput<typeof chatStreamEventSchema>;

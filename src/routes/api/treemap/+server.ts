import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTreemapData } from '$lib/server/query/index.js';
import * as v from 'valibot';

const QuerySchema = v.object({
  analysisId: v.pipe(
    v.union([v.string(), v.undefined()]),
    v.transform((input) => {
      if (!input) {
        throw new Error('analysisId is required');
      }
      const num = Number(input);
      if (isNaN(num) || num < 1) {
        throw new Error('Invalid analysisId');
      }
      return num;
    }),
  ),
  includeSymbols: v.optional(
    v.pipe(
      v.union([v.string(), v.undefined()]),
      v.transform((input) => {
        if (!input) return false;
        return input === 'true';
      }),
    ),
  ),
  maxModules: v.optional(
    v.pipe(
      v.union([v.string(), v.undefined()]),
      v.transform((input) => {
        if (!input) return 1000;
        const num = Number(input);
        if (isNaN(num) || num < 1) return 1000;
        return num > 10000 ? 10000 : num;
      }),
    ),
  ),
});

export const GET: RequestHandler = async ({ url }) => {
  // Extract query parameters
  const params: Record<string, string | undefined> = {
    analysisId: url.searchParams.get('analysisId') || undefined,
    includeSymbols: url.searchParams.get('includeSymbols') || undefined,
    maxModules: url.searchParams.get('maxModules') || undefined,
  };

  // Validate with valibot
  const result = v.safeParse(QuerySchema, params);
  if (!result.success) {
    return json({ error: 'Invalid query parameters', details: result.issues }, { status: 400 });
  }

  const { analysisId, includeSymbols = false, maxModules = 1000 } = result.output;

  try {
    const treemapData = await getTreemapData(analysisId, {
      includeSymbols,
      maxModules,
    });

    return json(treemapData);
  } catch (err) {
    console.error('Error fetching treemap data:', err);
    return json({ error: 'Failed to fetch treemap data' }, { status: 500 });
  }
};

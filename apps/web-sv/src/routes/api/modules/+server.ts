import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getModulesByAnalysis } from '$lib/server/query/index.js';
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
  page: v.optional(
    v.pipe(
      v.union([v.string(), v.undefined()]),
      v.transform((input) => {
        if (!input) return 1;
        const num = Number(input);
        return isNaN(num) || num < 1 ? 1 : num;
      }),
    ),
  ),
  pageSize: v.optional(
    v.pipe(
      v.union([v.string(), v.undefined()]),
      v.transform((input) => {
        if (!input) return 50;
        const num = Number(input);
        if (isNaN(num) || num < 1) return 50;
        return num > 1000 ? 1000 : num;
      }),
    ),
  ),
  sortBy: v.optional(
    v.picklist(['filePath', 'bundledSize', 'originalSize'], 'Invalid sortBy value'),
  ),
  sortOrder: v.optional(v.picklist(['asc', 'desc'], 'Invalid sortOrder value')),
  search: v.optional(v.union([v.string(), v.undefined()])),
  fileType: v.optional(v.union([v.string(), v.undefined()])),
  isThirdParty: v.optional(
    v.pipe(
      v.union([v.string(), v.undefined()]),
      v.transform((input) => {
        if (!input) return undefined;
        return input === 'true' ? true : input === 'false' ? false : undefined;
      }),
    ),
  ),
});

export const GET: RequestHandler = async ({ url }) => {
  // Extract query parameters - query params come as strings
  // Build params object with all expected keys, using undefined for missing ones
  const params: Record<string, string | undefined> = {
    analysisId: url.searchParams.get('analysisId') || undefined,
    page: url.searchParams.get('page') || undefined,
    pageSize: url.searchParams.get('pageSize') || undefined,
    sortBy: url.searchParams.get('sortBy') || undefined,
    sortOrder: url.searchParams.get('sortOrder') || undefined,
    search: url.searchParams.get('search') || undefined,
    fileType: url.searchParams.get('fileType') || undefined,
    isThirdParty: url.searchParams.get('isThirdParty') || undefined,
  };

  // Validate with valibot
  const result = v.safeParse(QuerySchema, params);
  if (!result.success) {
    return json({ error: 'Invalid query parameters', details: result.issues }, { status: 400 });
  }

  const {
    analysisId,
    page = 1,
    pageSize = 50,
    sortBy = 'bundledSize',
    sortOrder = 'desc',
    search,
    fileType,
    isThirdParty,
  } = result.output;

  try {
    const queryResult = await getModulesByAnalysis(analysisId, {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      fileType,
      isThirdParty,
    });

    return json(queryResult);
  } catch (err) {
    console.error('Error fetching modules:', err);
    return json({ error: 'Failed to fetch modules' }, { status: 500 });
  }
};

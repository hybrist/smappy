import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getModulesByAnalysis } from '$lib/server/query/index.js';

export const GET: RequestHandler = async ({ url }) => {
  const analysisIdParam = url.searchParams.get('analysisId');
  if (!analysisIdParam) {
    return json({ error: 'analysisId is required' }, { status: 400 });
  }

  const analysisId = parseInt(analysisIdParam, 10);
  if (isNaN(analysisId)) {
    return json({ error: 'Invalid analysisId' }, { status: 400 });
  }

  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10);
  const sortBy = (url.searchParams.get('sortBy') || 'bundledSize') as
    | 'filePath'
    | 'bundledSize'
    | 'originalSize';
  const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  const search = url.searchParams.get('search') || undefined;
  const fileType = url.searchParams.get('fileType') || undefined;
  const isThirdPartyParam = url.searchParams.get('isThirdParty');
  const isThirdParty = isThirdPartyParam !== null ? isThirdPartyParam === 'true' : undefined;

  try {
    const result = await getModulesByAnalysis(analysisId, {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      fileType,
      isThirdParty,
    });

    return json(result);
  } catch (error) {
    console.error('Error fetching modules:', error);
    return json({ error: 'Failed to fetch modules' }, { status: 500 });
  }
};

import { getAllProjects } from '$lib/server/query/index.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const projects = await getAllProjects();

  return {
    projects,
  };
};

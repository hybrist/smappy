import { getAllProjects } from '$lib/server/query/index.js';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async () => {
  const projects = await getAllProjects();

  return {
    projects,
  };
};

import { getAllProjects } from '$lib/server/query/data.remote';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async () => {
  const projects = await getAllProjects(undefined);

  return {
    projects,
  };
};

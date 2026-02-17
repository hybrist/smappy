import type { ProjectInfo } from './types.ts';
import type { BuildRunner } from './abstract.ts';
import { WebpackBuildRunner } from '../webpack/runner.ts';
import { NextjsBuildRunner } from './nextjs.ts';

export type { BuildOptions, BuildResult } from './types.ts';
export { runBuild } from './runner.ts';
export type { BuildRunner, ProjectInfo };

export function createBuilderOrNull(
  project: ProjectInfo,
  debug: boolean,
): BuildRunner | null {
  switch (project.bundler) {
    case 'nextjs':
      return new NextjsBuildRunner(project, debug);

    case 'webpack':
      return new WebpackBuildRunner(project, debug);

    default:
      return null;
  }
}

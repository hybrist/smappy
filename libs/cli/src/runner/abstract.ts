import { spawnSync } from "node:child_process";
import type { BuildRunOptions, ProjectInfo } from "./types.ts";
import type { BundlerAdapter } from "../plugins/adapters.ts";

export abstract class BuildRunner {
  readonly #project: ProjectInfo;
  readonly #debug: boolean;

  constructor(project: ProjectInfo, debug: boolean) {
    this.#project = project;
    this.#debug = debug;
  }

  get project(): ProjectInfo {
    return this.#project;
  }

  protected get debug(): boolean {
    return this.#debug;
  }

  abstract runBuild(options: BuildRunOptions): Promise<BundlerAdapter | null>;
}

export function npx(project: ProjectInfo, cmd: string, args: string[]) {
  const result = spawnSync("npx", [cmd, ...args], {
    // Forward stdout/stderr but ignore stdin.
    stdio: ["ignore", "inherit", "inherit"],
    cwd: project.path,
    env: {
      ...process.env,
      CI: "1",
      NODE_ENV: "production",
    },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `Command failed with exit code ${result.status}: npx ${cmd} ${args.join(" ")}`,
    );
  }
}

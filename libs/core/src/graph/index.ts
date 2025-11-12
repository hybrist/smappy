/**
 * Dependency graph module exports
 */

export {
  buildDependencyGraph,
  resolveModule,
  findCircularDependencies,
  isThirdPartyModule,
  extractPackageName,
  type BuilderOptions,
  type ResolvedModule,
  type DependencyGraph,
  type PackageMetadata,
} from "./builder.js";

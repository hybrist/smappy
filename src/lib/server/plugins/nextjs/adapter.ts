/**
 * Next.js adapter built on top of the webpack adapter
 * Provides Next-specific normalization for module identifiers and bundles
 */

import { extname } from 'node:path';
import type {
  BundlerBundle,
  BundlerChunk,
  BundlerModule,
  BundlerPluginOptions,
  PluginConfig,
  PluginExtractionResult,
} from '../types.js';
import { WebpackAdapter } from '../webpack/adapter.js';

/**
 * Supported Next.js build targets
 */
export type NextJsBuildTarget = 'client' | 'server' | 'edge' | 'middleware';

/**
 * Supported Next.js runtimes
 */
export type NextJsRuntime = 'nodejs' | 'edge';

/**
 * Options for the Next.js adapter
 */
export interface NextJsAdapterOptions extends BundlerPluginOptions {
  buildTarget: NextJsBuildTarget;
  runtime?: NextJsRuntime;
}

/**
 * Adapter for extracting bundle data from Next.js builds
 * Extends the webpack adapter and adds Next-specific normalization
 */
export class NextJsAdapter extends WebpackAdapter {
  private buildTarget: NextJsBuildTarget;
  private runtime: NextJsRuntime;

  constructor(baseDir: string, options: NextJsAdapterOptions, config?: PluginConfig) {
    super(baseDir, options, config);
    this.buildTarget = options.buildTarget;
    this.runtime =
      options.runtime ??
      (options.buildTarget === 'edge' || options.buildTarget === 'middleware' ? 'edge' : 'nodejs');
  }

  /**
   * Override extract to set bundler type to nextjs
   */
  extract(bundlerOutput: unknown): PluginExtractionResult {
    const result = super.extract(bundlerOutput);

    return {
      ...result,
      bundles: result.bundles.map((bundle) => ({
        ...bundle,
        fileName: sanitizeAssetPath(bundle.fileName, this.buildTarget),
      })),
      modules: result.modules.map((module) => ({
        ...module,
        filePath: toAbsoluteModuleId(sanitizeModuleIdentifier(module.filePath), this.baseDir),
      })),
      chunks: result.chunks.map((chunk) => ({
        ...chunk,
        name: sanitizeChunkName(chunk.name),
        moduleIds: chunk.moduleIds.map((id) =>
          toAbsoluteModuleId(sanitizeModuleIdentifier(id), this.baseDir),
        ),
      })),
      options: {
        ...result.options,
        bundlerType: 'nextjs',
      },
    };
  }

  /**
   * Normalize module identifiers before delegating to webpack adapter
   */
  protected convertModules(
    bundlerModules: BundlerModule[],
    errors: string[],
  ): ReturnType<WebpackAdapter['convertModules']> {
    const normalizedModules = bundlerModules.map((module) => ({
      ...module,
      identifier: sanitizeModuleIdentifier(module.identifier),
      name: module.name ? sanitizeModuleIdentifier(module.name) : module.name,
    }));

    return super.convertModules(normalizedModules, errors);
  }

  /**
   * Normalize chunk metadata before delegating
   */
  protected convertChunks(
    bundlerChunks: BundlerChunk[],
    errors: string[],
  ): ReturnType<WebpackAdapter['convertChunks']> {
    const normalizedChunks = bundlerChunks.map((chunk) => ({
      ...chunk,
      name: sanitizeChunkName(chunk.name),
      modules: chunk.modules?.map((moduleId) =>
        toAbsoluteModuleId(sanitizeModuleIdentifier(moduleId), this.baseDir),
      ),
    }));

    return super.convertChunks(normalizedChunks, errors);
  }

  /**
   * Normalize bundle file names before delegating
   */
  protected convertBundles(
    bundlerBundles: BundlerBundle[],
    errors: string[],
  ): ReturnType<WebpackAdapter['convertBundles']> {
    const normalizedBundles = bundlerBundles.map((bundle) => ({
      ...bundle,
      fileName: sanitizeAssetPath(bundle.fileName, this.buildTarget),
    }));

    return super.convertBundles(normalizedBundles, errors);
  }
}

/**
 * Determine if a path has a JavaScript or TypeScript extension
 */
function hasModuleExtension(path: string): boolean {
  const extension = extname(path).toLowerCase();
  return ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx'].includes(extension);
}

/**
 * Normalize module identifiers by removing loader prefixes, query strings,
 * and translating private Next.js internals to user-friendly paths.
 */
export function sanitizeModuleIdentifier(identifier: string): string {
  if (!identifier) {
    return identifier;
  }

  const withoutLoader = stripWebpackLoaders(identifier);
  const { resourcePath, queryString } = splitResourceQuery(withoutLoader);

  let normalized = normalizeInternalPath(resourcePath);

  if (!hasModuleExtension(normalized) && queryString) {
    const extracted = extractPathFromQuery(queryString);
    if (extracted) {
      normalized = normalizeInternalPath(extracted);
    }
  }

  return normalized;
}

/**
 * Sanitize bundle file paths to remove redundant prefixes
 */
function sanitizeAssetPath(fileName: string, target: NextJsBuildTarget): string {
  if (!fileName) {
    return fileName;
  }

  let sanitized = fileName.replace(/\\/g, '/');

  sanitized = sanitized.replace(/^\.next\//, '');
  sanitized = sanitized.replace(/^static\/chunks\/(webpack-[\w-]+)\.js$/, 'static/chunks/$1.js');
  sanitized = sanitized.replace(/^server\/app\//, 'app/');
  sanitized = sanitized.replace(/^server\/pages\//, 'pages/');

  if (target === 'middleware' || target === 'edge') {
    sanitized = sanitized.replace(/^server\/middleware\//, 'middleware/');
  }

  return sanitized;
}

/**
 * Remove query decorations from chunk names
 */
function sanitizeChunkName(name: string): string {
  if (!name) {
    return name;
  }
  return name.split('?')[0];
}

/**
 * Strip loader prefixes (webpack style loader!resource syntax)
 */
function stripWebpackLoaders(identifier: string): string {
  const segments = identifier.split('!');
  return segments[segments.length - 1] || identifier;
}

/**
 * Split resource path from query string
 */
function splitResourceQuery(resource: string): { resourcePath: string; queryString?: string } {
  const [pathPart, ...queryParts] = resource.split('?');
  return {
    resourcePath: pathPart,
    queryString: queryParts.length > 0 ? queryParts.join('?') : undefined,
  };
}

/**
 * Normalize Next.js private internals to user-facing directories
 */
function normalizeInternalPath(resourcePath: string): string {
  let normalized = resourcePath.replace(/\\/g, '/');

  normalized = normalized.replace(/^\.\/+/, '').replace(/^\/+/, '');
  normalized = normalized.replace(/^private-next-pages\//, 'pages/');
  normalized = normalized.replace(/^private-next-app-dir\//, 'app/');
  normalized = normalized.replace(/^private-next-middleware\//, 'middleware/');
  normalized = normalized.replace(/^webpack-runtime\//, 'runtime/');
  normalized = normalized.replace(/^__flight__\//, 'flight/');

  if (normalized.startsWith('node_modules/.pnpm/')) {
    const [, rest] = normalized.split('node_modules/.pnpm/');
    if (rest) {
      normalized = `node_modules/${rest.split('/node_modules/').pop() || rest}`;
    }
  }

  return normalized;
}

/**
 * Attempt to extract the original file path from a Next.js resource query.
 * Handles parameters such as absolutePagePath, page, modules, appDir, etc.
 */
function extractPathFromQuery(query: string): string | undefined {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(query);
  } catch {
    return undefined;
  }

  const lookupKeys = [
    'absolutePagePath',
    'absoluteAppPath',
    'page',
    'appDir',
    'middleware',
    'path',
    'resource',
    'modules',
    'module',
    'entry',
  ];

  for (const key of lookupKeys) {
    const value = params.get(key);
    if (!value) continue;

    const decoded = decodeURIComponent(value);
    if (hasModuleExtension(decoded)) {
      return decoded;
    }

    // Some query params still contain loader syntax; recursively sanitize
    const withoutLoader = stripWebpackLoaders(decoded);
    if (hasModuleExtension(withoutLoader)) {
      return withoutLoader;
    }

    // Handle comma-separated module lists (e.g., modules=a%2Fb.tsx,b%2Fc.ts)
    if (decoded.includes(',')) {
      const candidate = decoded
        .split(',')
        .map((item) => decodeURIComponent(item.trim()))
        .find((item) => hasModuleExtension(item));
      if (candidate) {
        return stripWebpackLoaders(candidate);
      }
    }
  }

  return undefined;
}

/**
 * Convert a module identifier to a base-directory-relative path
 */
function toAbsoluteModuleId(moduleId: string, baseDir: string): string {
  if (!moduleId) {
    return moduleId;
  }

  const normalizedBase = baseDir.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  const cleaned = moduleId.replace(/\\/g, '/').replace(/^\.\/+/, '');

  if (
    cleaned.startsWith(`${normalizedBase}/`) ||
    cleaned.startsWith('node_modules/') ||
    cleaned.startsWith('virtual:') ||
    cleaned.startsWith('webpack/')
  ) {
    return cleaned;
  }

  const withoutLeadingSlash = cleaned.replace(/^\/+/, '');
  if (withoutLeadingSlash.length === 0) {
    return normalizedBase;
  }

  return `${normalizedBase}/${withoutLeadingSlash}`;
}

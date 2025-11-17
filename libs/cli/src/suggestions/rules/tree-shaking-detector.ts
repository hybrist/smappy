/**
 * Tree-shaking detector rule
 * Detects unused exports that could be tree-shaken for size savings
 */

import type { SuggestionRule, SuggestionContext } from "../types.ts";
import type { SuggestionData } from "../../ingestion/db/writer.ts";

export interface TreeShakingDetectorOptions {
  /** Minimum size in bytes to trigger a suggestion */
  minSizeThreshold?: number;
  /** Whether to detect partially unused symbols */
  detectPartiallyUnused?: boolean;
}

const DEFAULT_OPTIONS: Required<TreeShakingDetectorOptions> = {
  minSizeThreshold: 100, // 100 bytes minimum
  detectPartiallyUnused: true,
};

/**
 * Creates a tree-shaking detector rule
 * @param options - Configuration options
 */
export function createTreeShakingDetector(
  options: TreeShakingDetectorOptions = {},
): SuggestionRule {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return {
    id: "tree-shaking-detector",
    name: "Tree-shaking Detector",
    description:
      "Detects unused exports that could be tree-shaken for size savings",

    execute(context: SuggestionContext): SuggestionData[] {
      const suggestions: SuggestionData[] = [];

      for (const module of context.modules) {
        // Skip modules without export information
        if (!module.exports || module.exports.length === 0) {
          continue;
        }

        // Determine used exports (default to empty array if not available)
        const usedExports = new Set(module.usedExports || []);
        const allExports = module.exports;

        // Find completely unused exports
        const unusedExports = allExports.filter((exp) => !usedExports.has(exp));

        if (unusedExports.length === 0) {
          continue;
        }

        // Calculate potential savings
        // If all exports are unused, the entire module could potentially be removed
        const isCompletelyUnused = unusedExports.length === allExports.length;
        const potentialSavings = isCompletelyUnused
          ? module.bundledSize
          : Math.floor(
              (module.bundledSize * unusedExports.length) / allExports.length,
            );

        // Skip if savings are below threshold
        if (potentialSavings < opts.minSizeThreshold) {
          continue;
        }

        // Create suggestion
        const severity = isCompletelyUnused
          ? ("warning" as const)
          : potentialSavings > 1000
            ? ("warning" as const)
            : ("info" as const);

        const unusedExportsText =
          unusedExports.length <= 3
            ? unusedExports.map((e) => `'${e}'`).join(", ")
            : `${unusedExports.length} exports`;

        const title = isCompletelyUnused
          ? `Module has no used exports`
          : `Module has unused exports`;

        const description = isCompletelyUnused
          ? `The module '${module.filePath}' exports ${allExports.length} symbol(s) but none are used. ` +
            `This module could potentially be removed, saving ~${formatBytes(potentialSavings)}.`
          : `The module '${module.filePath}' exports ${allExports.length} symbol(s) but only ${usedExports.size} are used. ` +
            `Unused exports: ${unusedExportsText}. ` +
            `Removing unused exports could save ~${formatBytes(potentialSavings)}.`;

        // Build links array
        const links: SuggestionData["links"] = [
          {
            entityType: "Module",
            entityPath: module.filePath,
          },
        ];

        // Add symbol links for unused exports (limit to avoid too many links)
        if (
          opts.detectPartiallyUnused &&
          !isCompletelyUnused &&
          unusedExports.length <= 10
        ) {
          for (const exportName of unusedExports) {
            links.push({
              entityType: "Symbol",
              entityPath: `${module.filePath}:${exportName}`,
            });
          }
        }

        suggestions.push({
          type: "tree-shaking",
          severity,
          title,
          description,
          links,
        });
      }

      return suggestions;
    },
  };
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(2)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

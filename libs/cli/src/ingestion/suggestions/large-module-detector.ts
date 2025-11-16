/**
 * Large module detector
 * Identifies modules that are excessively large and could benefit from code splitting or refactoring
 */

import type {
  SuggestionRule,
  SuggestionContext,
} from "../../suggestions/types.ts";
import type { SuggestionData } from "../db/writer.ts";

/**
 * Configuration for large module detection
 */
export interface LargeModuleDetectorConfig {
  /** Size threshold in bytes for warnings (default: 50KB) */
  warningThreshold?: number;
  /** Size threshold in bytes for critical warnings (default: 100KB) */
  criticalThreshold?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<LargeModuleDetectorConfig> = {
  warningThreshold: 50 * 1024, // 50KB
  criticalThreshold: 100 * 1024, // 100KB
};

/**
 * Detect modules that are excessively large
 */
export class LargeModuleDetector implements SuggestionRule {
  readonly id = "large-module";
  readonly name = "Large Module Detector";
  readonly description =
    "Identifies modules that are excessively large and could benefit from code splitting";

  private config: Required<LargeModuleDetectorConfig>;

  constructor(config?: LargeModuleDetectorConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Execute the rule and generate suggestions
   */
  execute(context: SuggestionContext): SuggestionData[] {
    const suggestions: SuggestionData[] = [];

    for (const module of context.modules) {
      // Skip third-party modules as they're typically not under direct control
      if (module.isThirdParty) {
        continue;
      }

      const size = module.bundledSize;
      let severity: "critical" | "warning" | null = null;
      let title = "";
      let description = "";

      if (size >= this.config.criticalThreshold) {
        severity = "critical";
        title = `Critical: Very large module detected (${this.formatSize(size)})`;
        description = this.buildDescription(module.filePath, size, "critical");
      } else if (size >= this.config.warningThreshold) {
        severity = "warning";
        title = `Large module detected (${this.formatSize(size)})`;
        description = this.buildDescription(module.filePath, size, "warning");
      }

      if (severity) {
        suggestions.push({
          type: "LARGE_MODULE",
          severity,
          title,
          description,
          links: [
            {
              entityType: "Module",
              entityPath: module.filePath,
            },
          ],
        });
      }
    }

    return suggestions;
  }

  /**
   * Build a detailed description for the suggestion
   */
  private buildDescription(
    filePath: string,
    size: number,
    severity: "critical" | "warning",
  ): string {
    const threshold =
      severity === "critical"
        ? this.config.criticalThreshold
        : this.config.warningThreshold;

    let description = `Module \`${filePath}\` has a bundled size of ${this.formatSize(size)}, `;
    description += `which exceeds the ${severity} threshold of ${this.formatSize(threshold)}.\n\n`;
    description += "Consider the following optimization strategies:\n\n";
    description +=
      "- **Code splitting**: Break the module into smaller, more focused modules\n";
    description +=
      "- **Lazy loading**: Use dynamic imports for non-critical code paths\n";
    description +=
      "- **Tree shaking**: Ensure exports are granular and unused code can be eliminated\n";
    description +=
      "- **Refactoring**: Look for multiple concerns that could be separated into different modules";

    return description;
  }

  /**
   * Format size in bytes to a human-readable string
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes}B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)}KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    }
  }
}

/**
 * Create a large module detector with optional configuration
 */
export function createLargeModuleDetector(
  config?: LargeModuleDetectorConfig,
): LargeModuleDetector {
  return new LargeModuleDetector(config);
}

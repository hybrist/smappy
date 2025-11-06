/**
 * Duplicate code detector
 * Detects duplicate or similar code blocks across modules that could be refactored into shared utilities
 */

import type { SuggestionRule, SuggestionContext } from '../../suggestions/types.js';
import type { SuggestionData } from '../db/writer.js';
import { extractSymbols } from '../ast/analyzer.js';

/**
 * Configuration for duplicate code detection
 */
export interface DuplicateDetectorConfig {
  /** Similarity threshold as percentage (0-100). Default: 80 */
  similarityThreshold?: number;
  /** Minimum size in bytes for code to be considered. Default: 100 bytes */
  minCodeSize?: number;
  /** Whether to skip third-party modules. Default: true */
  skipThirdParty?: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<DuplicateDetectorConfig> = {
  similarityThreshold: 80,
  minCodeSize: 100,
  skipThirdParty: true,
};

/**
 * Represents a code block that can be compared
 */
interface CodeBlock {
  filePath: string;
  symbolName: string;
  astHash: string;
  code: string;
  size: number;
  startLine: number;
  endLine: number;
}

/**
 * Represents a pair of duplicate/similar code blocks
 */
interface DuplicatePair {
  block1: CodeBlock;
  block2: CodeBlock;
  similarity: number;
}

/**
 * Detect duplicate or similar code across modules
 */
export class DuplicateDetector implements SuggestionRule {
  readonly id = 'duplicate-code';
  readonly name = 'Duplicate Code Detector';
  readonly description = 'Detects duplicate or similar code blocks across modules';

  private config: Required<DuplicateDetectorConfig>;

  constructor(config?: DuplicateDetectorConfig) {
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

    // Extract all code blocks from modules
    const codeBlocks = this.extractCodeBlocks(context);

    // Find duplicate pairs
    const duplicates = this.findDuplicates(codeBlocks);

    // Generate suggestions for each duplicate pair
    for (const duplicate of duplicates) {
      const suggestion = this.createSuggestion(duplicate);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  /**
   * Extract code blocks from all modules
   */
  private extractCodeBlocks(context: SuggestionContext): CodeBlock[] {
    const blocks: CodeBlock[] = [];

    for (const module of context.modules) {
      // Skip third-party modules if configured
      if (this.config.skipThirdParty && module.isThirdParty) {
        continue;
      }

      // Skip modules that are too small
      if (module.bundledSize < this.config.minCodeSize) {
        continue;
      }

      // Extract symbols from the module
      const analysis = extractSymbols(module.sourceContent, {
        filePath: module.filePath,
        includeNested: false,
      });

      // Skip if no symbols found (e.g., only comments)
      if (analysis.symbols.length === 0) {
        continue;
      }

      // Create code blocks for each significant symbol
      for (const symbol of analysis.symbols) {
        // Only consider functions and classes
        if (symbol.type !== 'function' && symbol.type !== 'class') {
          continue;
        }

        // Extract code for this symbol
        const code = this.extractSymbolCode(
          module.sourceContent,
          symbol.location.start.line,
          symbol.location.end.line,
        );

        if (code.length < this.config.minCodeSize) {
          continue;
        }

        // Generate a hash for this specific code block
        const astHash = this.generateCodeHash(code);

        blocks.push({
          filePath: module.filePath,
          symbolName: symbol.name,
          astHash,
          code,
          size: symbol.size,
          startLine: symbol.location.start.line,
          endLine: symbol.location.end.line,
        });
      }

      // Also consider the entire module as a block for exact duplicates
      // Only if it has meaningful code (symbols)
      if (analysis.astHash && analysis.symbols.length > 0) {
        blocks.push({
          filePath: module.filePath,
          symbolName: '(entire module)',
          astHash: analysis.astHash,
          code: module.sourceContent,
          size: module.bundledSize,
          startLine: 1,
          endLine: module.sourceContent.split('\n').length,
        });
      }
    }

    return blocks;
  }

  /**
   * Extract code between specific lines
   */
  private extractSymbolCode(sourceContent: string, startLine: number, endLine: number): string {
    const lines = sourceContent.split('\n');
    return lines.slice(startLine - 1, endLine).join('\n');
  }

  /**
   * Generate a hash for code content using a proper hash algorithm
   */
  private generateCodeHash(code: string): string {
    // Normalize the code before hashing
    const normalized = this.normalizeCode(code);

    // Use a simple but better hash (FNV-1a)
    let hash = 2166136261; // FNV offset basis
    for (let i = 0; i < normalized.length; i++) {
      hash ^= normalized.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(36);
  }

  /**
   * Normalize code for comparison (remove whitespace, comments, etc.)
   */
  private normalizeCode(code: string): string {
    return (
      code
        // Remove single-line comments
        .replace(/\/\/.*$/gm, '')
        // Remove multi-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  /**
   * Find duplicate code blocks with optimized O(n) hash grouping
   */
  private findDuplicates(blocks: CodeBlock[]): DuplicatePair[] {
    const duplicates: DuplicatePair[] = [];
    const seen = new Set<string>();

    // Group blocks by hash for O(n) lookups of exact duplicates
    const hashGroups = new Map<string, CodeBlock[]>();
    for (const block of blocks) {
      const existing = hashGroups.get(block.astHash);
      if (existing) {
        existing.push(block);
      } else {
        hashGroups.set(block.astHash, [block]);
      }
    }

    // Check exact duplicates from hash groups
    for (const [_hash, group] of hashGroups) {
      if (group.length > 1) {
        // Found exact duplicates
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const block1 = group[i];
            const block2 = group[j];

            // Skip if from the same file
            if (block1.filePath === block2.filePath) {
              continue;
            }

            const pairKey = [block1.filePath, block1.symbolName, block2.filePath, block2.symbolName]
              .sort()
              .join('|');

            if (!seen.has(pairKey)) {
              duplicates.push({ block1, block2, similarity: 100 });
              seen.add(pairKey);
            }
          }
        }
      }
    }

    // For similar (non-exact) matches, only compare blocks of similar size
    // This reduces comparisons significantly
    const sizeGroups = new Map<number, CodeBlock[]>();
    for (const block of blocks) {
      // Group by size bucket (within 20% of each other)
      const sizeBucket = Math.floor(block.size / (block.size * 0.2));
      const existing = sizeGroups.get(sizeBucket);
      if (existing) {
        existing.push(block);
      } else {
        sizeGroups.set(sizeBucket, [block]);
      }
    }

    // Only compare blocks in the same size bucket
    for (const [_bucket, group] of sizeGroups) {
      if (group.length < 2) continue;

      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const block1 = group[i];
          const block2 = group[j];

          // Skip if from the same file
          if (block1.filePath === block2.filePath) {
            continue;
          }

          // Skip if already found as exact duplicate
          if (block1.astHash === block2.astHash) {
            continue;
          }

          const pairKey = [block1.filePath, block1.symbolName, block2.filePath, block2.symbolName]
            .sort()
            .join('|');

          if (seen.has(pairKey)) {
            continue;
          }

          // Calculate similarity
          const similarity = this.calculateSimilarity(block1, block2);

          if (similarity >= this.config.similarityThreshold) {
            duplicates.push({ block1, block2, similarity });
            seen.add(pairKey);
          }
        }
      }
    }

    return duplicates;
  }

  /**
   * Calculate similarity between two code blocks (0-100)
   */
  private calculateSimilarity(block1: CodeBlock, block2: CodeBlock): number {
    // Exact match via hash
    if (block1.astHash === block2.astHash) {
      return 100;
    }

    // Calculate Levenshtein distance-based similarity
    const normalized1 = this.normalizeCode(block1.code);
    const normalized2 = this.normalizeCode(block2.code);

    if (normalized1 === normalized2) {
      return 100;
    }

    // Use a simpler similarity metric based on common tokens
    const similarity = this.tokenSimilarity(normalized1, normalized2);
    return Math.round(similarity * 100);
  }

  /**
   * Calculate token-based similarity (Jaccard similarity)
   */
  private tokenSimilarity(code1: string, code2: string): number {
    // Split on word boundaries and operators to get meaningful tokens
    const tokenize = (code: string) => {
      return code
        .split(/[\s+\-*/=<>!&|(){}[\];,.:]+/)
        .filter((t) => t.length > 0)
        .filter((t) => !/^[0-9]+$/.test(t)); // Filter out pure numbers
    };

    const tokens1 = tokenize(code1);
    const tokens2 = tokenize(code2);

    if (tokens1.length === 0 && tokens2.length === 0) {
      return 1;
    }

    if (tokens1.length === 0 || tokens2.length === 0) {
      return 0;
    }

    // Count token frequencies
    const freq1 = new Map<string, number>();
    const freq2 = new Map<string, number>();

    tokens1.forEach((token) => freq1.set(token, (freq1.get(token) || 0) + 1));
    tokens2.forEach((token) => freq2.set(token, (freq2.get(token) || 0) + 1));

    // Calculate cosine similarity using token frequencies
    const allTokens = new Set([...freq1.keys(), ...freq2.keys()]);
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (const token of allTokens) {
      const count1 = freq1.get(token) || 0;
      const count2 = freq2.get(token) || 0;
      dotProduct += count1 * count2;
      magnitude1 += count1 * count1;
      magnitude2 += count2 * count2;
    }

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    // Cosine similarity
    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
  }

  /**
   * Create a suggestion for a duplicate pair
   */
  private createSuggestion(duplicate: DuplicatePair): SuggestionData | null {
    const { block1, block2, similarity } = duplicate;

    // Calculate potential size savings
    const sizeSavings = Math.min(block1.size, block2.size);

    // Determine severity based on similarity and size
    let severity: 'critical' | 'warning' | 'info' = 'info';
    if (similarity >= 95 && sizeSavings > 500) {
      severity = 'critical';
    } else if (similarity >= 90 || sizeSavings > 300) {
      severity = 'warning';
    }

    const title = `Duplicate code detected (${similarity}% similar)`;
    const description = this.buildDescription(block1, block2, similarity, sizeSavings);

    return {
      type: 'DUPLICATE_CODE',
      severity,
      title,
      description,
      links: [
        {
          entityType: 'Module',
          entityPath: block1.filePath,
        },
        {
          entityType: 'Module',
          entityPath: block2.filePath,
        },
      ],
    };
  }

  /**
   * Build a detailed description for the suggestion
   */
  private buildDescription(
    block1: CodeBlock,
    block2: CodeBlock,
    similarity: number,
    sizeSavings: number,
  ): string {
    let description = `Found ${similarity}% similar code blocks:\n\n`;
    description += `**First occurrence:**\n`;
    description += `- Module: \`${block1.filePath}\`\n`;
    description += `- Symbol: \`${block1.symbolName}\`\n`;
    description += `- Lines: ${block1.startLine}-${block1.endLine}\n`;
    description += `- Size: ${this.formatSize(block1.size)}\n\n`;

    description += `**Second occurrence:**\n`;
    description += `- Module: \`${block2.filePath}\`\n`;
    description += `- Symbol: \`${block2.symbolName}\`\n`;
    description += `- Lines: ${block2.startLine}-${block2.endLine}\n`;
    description += `- Size: ${this.formatSize(block2.size)}\n\n`;

    description += `**Potential savings:**\n`;
    description += `By extracting the common code into a shared utility, you could save approximately ${this.formatSize(sizeSavings)}.\n\n`;

    description += `**Recommended actions:**\n`;
    description += `- Extract the duplicate code into a shared utility module\n`;
    description += `- Update both modules to import and use the shared code\n`;
    description += `- Consider using a barrel export pattern for better organization\n`;
    description += `- Add unit tests for the shared utility\n`;

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
 * Create a duplicate detector with optional configuration
 */
export function createDuplicateDetector(config?: DuplicateDetectorConfig): DuplicateDetector {
  return new DuplicateDetector(config);
}

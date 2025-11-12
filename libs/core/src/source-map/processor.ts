/**
 * Source map processing module
 * Implements source map parsing and position mapping using @jridgewell/source-map
 * Pure version with no file I/O (uses dependency injection for external source maps)
 */

import { SourceMapConsumer } from "@jridgewell/source-map";
import type { SourceMapInput } from "@jridgewell/source-map";
import type { SourceMap } from "../types.js";

/**
 * Position in source code
 */
export interface Position {
  line: number;
  column: number;
}

/**
 * Mapping from bundle position to source position
 */
export interface PositionMapping {
  generatedLine: number;
  generatedColumn: number;
  originalLine: number | null;
  originalColumn: number | null;
  source: string | null;
  name: string | null;
}

/**
 * Symbol fragment representing a byte range in the output
 */
export interface SymbolFragment {
  /** Symbol name */
  name: string;
  /** Start position in generated code */
  start: Position;
  /** End position in generated code */
  end: Position;
  /** Byte offset start in generated code */
  byteStart: number;
  /** Byte offset end in generated code */
  byteEnd: number;
  /** Size in bytes */
  size: number;
  /** Original source file */
  source: string | null;
}

/**
 * Parse source map from string content
 * Handles both regular source maps and inline data URLs
 *
 * @param content - Source map content as string or data URL
 * @returns Parsed source map object
 * @throws Error if source map is malformed or invalid
 */
export function parseSourceMap(content: string): SourceMap {
  try {
    let jsonContent = content;

    // Handle inline source maps (data URLs)
    if (content.startsWith("data:")) {
      const match = content.match(
        /^data:application\/json;(?:charset=utf-8;)?base64,(.+)$/,
      );
      if (match) {
        jsonContent = Buffer.from(match[1], "base64").toString("utf-8");
      } else {
        // Try URL-encoded data URL
        const urlMatch = content.match(
          /^data:application\/json;charset=utf-8,(.+)$/,
        );
        if (urlMatch) {
          jsonContent = decodeURIComponent(urlMatch[1]);
        } else {
          throw new Error("Invalid data URL format for source map");
        }
      }
    }

    const parsed = JSON.parse(jsonContent);

    // Validate required fields
    if (!parsed.version || parsed.version !== 3) {
      throw new Error(
        `Invalid source map version: ${parsed.version}. Only version 3 is supported.`,
      );
    }

    if (!Array.isArray(parsed.sources)) {
      throw new Error('Source map must have a "sources" array');
    }

    if (typeof parsed.mappings !== "string") {
      throw new Error('Source map must have a "mappings" string');
    }

    return {
      version: parsed.version,
      sources: parsed.sources,
      sourcesContent: parsed.sourcesContent || null,
      mappings: parsed.mappings,
      names: parsed.names || [],
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse source map JSON: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create position mappings from bundle content and source map
 * Uses @jridgewell/source-map to decode the mappings
 *
 * @param bundleContent - The generated bundle content
 * @param sourceMap - Parsed source map object
 * @returns Array of position mappings
 */
export function mapBundleToSource(
  bundleContent: string,
  sourceMap: SourceMap,
): PositionMapping[] {
  try {
    // Cast to SourceMapInput to work around type incompatibility between our SourceMap type
    // and the @jridgewell/source-map SourceMapInput type
    const consumer = new SourceMapConsumer(sourceMap as SourceMapInput);
    const mappings: PositionMapping[] = [];

    // Use eachMapping to iterate through all mappings
    consumer.eachMapping((mapping) => {
      mappings.push({
        generatedLine: mapping.generatedLine,
        generatedColumn: mapping.generatedColumn,
        originalLine: mapping.originalLine,
        originalColumn: mapping.originalColumn,
        source: mapping.source,
        name: mapping.name,
      });
    });

    return mappings;
  } catch (error) {
    throw new Error(
      `Failed to create position mappings: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Calculate byte offset from line and column position
 *
 * @param content - The source content
 * @param line - Line number (1-indexed)
 * @param column - Column number (0-indexed)
 * @returns Byte offset in the content
 */
function calculateByteOffset(
  content: string,
  line: number,
  column: number,
): number {
  const lines = content.split("\n");
  let offset = 0;

  // Add bytes from all previous lines (including newline characters)
  for (let i = 0; i < line - 1; i++) {
    if (i < lines.length) {
      offset += Buffer.byteLength(lines[i], "utf-8") + 1; // +1 for newline
    }
  }

  // Add bytes from current line up to the column
  if (line - 1 < lines.length) {
    const lineContent = lines[line - 1].substring(0, column);
    offset += Buffer.byteLength(lineContent, "utf-8");
  }

  return offset;
}

/**
 * Compute byte ranges for symbols in the generated output
 * Maps symbol locations through source maps to calculate accurate byte ranges
 *
 * @param symbol - Symbol with location information
 * @param mappings - Position mappings from mapBundleToSource
 * @returns Symbol fragment with byte ranges
 */
export function computeSymbolFragments(
  symbol: {
    name: string;
    location: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
  },
  mappings: PositionMapping[],
): SymbolFragment | null {
  try {
    // Find the mapping closest to the symbol's start position
    // Weight line differences more heavily than column differences
    // since line proximity is typically more important for symbol matching
    let closestMapping: PositionMapping | null = null;
    let minDistance = Infinity;

    for (const mapping of mappings) {
      if (mapping.originalLine === null || mapping.originalColumn === null) {
        continue;
      }

      // Weighted distance: prioritize line proximity (10x weight)
      const distance =
        Math.abs(mapping.originalLine - symbol.location.start.line) * 10 +
        Math.abs(mapping.originalColumn - symbol.location.start.column);

      if (distance < minDistance) {
        minDistance = distance;
        closestMapping = mapping;
      }
    }

    if (!closestMapping) {
      return null;
    }

    // For symbols without bundle content, use placeholder values
    // Use -1 to explicitly indicate unset/invalid byte data
    const fragment: SymbolFragment = {
      name: symbol.name,
      start: {
        line: closestMapping.generatedLine,
        column: closestMapping.generatedColumn,
      },
      end: {
        line: closestMapping.generatedLine,
        column: closestMapping.generatedColumn + symbol.name.length,
      },
      byteStart: -1, // Indicates invalid/unset - use computeSymbolFragmentsWithContent for accurate values
      byteEnd: -1, // Indicates invalid/unset - use computeSymbolFragmentsWithContent for accurate values
      size: 0, // Use computeSymbolFragmentsWithContent for accurate byte size
      source: closestMapping.source,
    };

    return fragment;
  } catch (error) {
    throw new Error(
      `Failed to compute symbol fragments: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Enhanced version of computeSymbolFragments that includes bundle content for accurate byte calculation
 *
 * @param symbol - Symbol with location information
 * @param bundleContent - The generated bundle content
 * @param mappings - Position mappings from mapBundleToSource
 * @returns Symbol fragment with accurate byte ranges
 */
export function computeSymbolFragmentsWithContent(
  symbol: {
    name: string;
    location: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
  },
  bundleContent: string,
  mappings: PositionMapping[],
): SymbolFragment | null {
  const fragment = computeSymbolFragments(symbol, mappings);

  if (!fragment) {
    return null;
  }

  // Calculate accurate byte offsets using the bundle content
  fragment.byteStart = calculateByteOffset(
    bundleContent,
    fragment.start.line,
    fragment.start.column,
  );
  fragment.byteEnd = calculateByteOffset(
    bundleContent,
    fragment.end.line,
    fragment.end.column,
  );
  fragment.size = fragment.byteEnd - fragment.byteStart;

  return fragment;
}

/**
 * Handle external .map files by reading and parsing them
 * Uses dependency injection for file reading to maintain purity
 *
 * @param mapFilePath - Path to the .map file
 * @param readFile - Function to read file content (dependency injection)
 * @returns Parsed source map
 */
export async function loadExternalSourceMap(
  mapFilePath: string,
  readFile: (path: string) => Promise<string>,
): Promise<SourceMap> {
  try {
    const content = await readFile(mapFilePath);
    return parseSourceMap(content);
  } catch (error) {
    throw new Error(
      `Failed to load external source map from ${mapFilePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

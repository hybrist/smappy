/**
 * AST analysis and symbol extraction module
 * Uses Babel parser and traverse for JavaScript code analysis
 */

export * from './analyzer.js';

// Re-export for backwards compatibility
import type { Symbol } from '../types/index.js';
import {
  extractSymbols as extractSymbolsImpl,
  analyzeFunctions as analyzeFunctionsImpl,
  analyzeClasses as analyzeClassesImpl,
} from './analyzer.js';

/**
 * Extract symbols from JavaScript code using AST analysis (legacy API)
 * @param code - JavaScript code to analyze
 * @returns Array of extracted symbols (without export info)
 * @deprecated Use extractSymbols from analyzer.ts for full functionality
 * @note This legacy API strips export metadata and scope information from symbols
 */
export function extractSymbols(code: string): Symbol[] {
  const result = extractSymbolsImpl(code);
  return result.symbols.map((s) => ({
    name: s.name,
    type: s.type === 'const' || s.type === 'let' ? 'variable' : s.type,
    location: s.location,
    size: s.size,
  }));
}

/**
 * Analyze function declarations and expressions (legacy API)
 * @param code - JavaScript code to analyze
 * @returns Array of function symbols
 * @deprecated Use analyzeFunctions from analyzer.ts for full functionality
 * @note This legacy API strips export metadata and scope information from symbols
 */
export function analyzeFunctions(code: string): Symbol[] {
  const symbols = analyzeFunctionsImpl(code);
  return symbols.map((s) => ({
    name: s.name,
    type: s.type === 'const' || s.type === 'let' ? 'variable' : s.type,
    location: s.location,
    size: s.size,
  }));
}

/**
 * Analyze class declarations (legacy API)
 * @param code - JavaScript code to analyze
 * @returns Array of class symbols
 * @deprecated Use analyzeClasses from analyzer.ts for full functionality
 * @note This legacy API strips export metadata and scope information from symbols
 */
export function analyzeClasses(code: string): Symbol[] {
  const symbols = analyzeClassesImpl(code);
  return symbols.map((s) => ({
    name: s.name,
    type: s.type === 'const' || s.type === 'let' ? 'variable' : s.type,
    location: s.location,
    size: s.size,
  }));
}

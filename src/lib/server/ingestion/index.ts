/**
 * Main orchestrator for bundle ingestion system
 * Coordinates the analysis pipeline from bundle input to database persistence
 */

import type { Bundle, AnalysisResult } from './types/index.js';
import { parseSourceMap, validateSourceMap } from './source-map/index.js';
import { extractSymbols } from './ast/index.js';
import { buildDependencyGraph } from './graph/index.js';
import { calculateBundleSizes } from './size/index.js';
import { compareAnalysisResults, canPerformIncrementalAnalysis } from './incremental/index.js';
import { writeAnalysisResult, getPreviousAnalysisResult } from './db/index.js';

/**
 * Process a bundle through the complete ingestion pipeline
 * @param bundle - Bundle to analyze
 * @returns Promise that resolves to analysis result
 */
export async function ingestBundle(bundle: Bundle): Promise<AnalysisResult> {
	// Parse source map if available
	let sourceMap = null;
	if (bundle.sourceMap) {
		sourceMap = parseSourceMap(bundle.sourceMap);
		if (!validateSourceMap(sourceMap)) {
			console.warn('Invalid source map for bundle:', bundle.id);
		}
	}

	// Extract symbols from code
	const symbols = extractSymbols(bundle.content);

	// Build dependency graph
	const dependencyGraph = buildDependencyGraph(new Map());

	// Calculate sizes
	const sizes = calculateBundleSizes(bundle.content);

	// Create analysis result
	const result: AnalysisResult = {
		bundleId: bundle.id,
		symbols,
		dependencyGraph,
		sizes
	};

	// Check for incremental analysis
	const previousResult = await getPreviousAnalysisResult(bundle.id);
	if (canPerformIncrementalAnalysis(previousResult, result)) {
		const diff = compareAnalysisResults(previousResult!, result);
		console.log('Incremental analysis diff:', diff);
	}

	// Persist results
	await writeAnalysisResult(result);

	return result;
}

/**
 * Re-export types for convenience
 */
export type { Bundle, AnalysisResult, Symbol, DependencyNode, SourceMap } from './types/index.js';

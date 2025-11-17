import { Injectable, inject } from '@angular/core';
import {
  BundleAnalysis,
  getChunksBySource,
  getMappingImpacts,
  getSourceContent,
} from '../models/bundle.models';
import {
  ASTNodeInfo,
  FragmentUsage,
  SourceAnalysisResult,
  SourceFragment,
} from '../models/source-analysis.models';
import { AstParserService } from '../parsers/ast-parser.service';
import { FileParsersService } from '../parsers/file-parsers.service';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class SourceAnalysisService {
  private readonly astParser = inject(AstParserService);
  private readonly fileParsers = inject(FileParsersService);
  private readonly storageService = inject(StorageService);

  // Cache for source analysis results keyed by bundleId:filePath
  private readonly analysisCache = new Map<
    string,
    SourceAnalysisResult | null
  >();

  /**
   * Analyze a source file using pre-parsed fragments from server
   */
  async analyzeSourceFileAsync(
    bundle: BundleAnalysis,
    filePath: string,
  ): Promise<SourceAnalysisResult | null> {
    // Create cache key from bundleId and file path
    const cacheKey = `${bundle.bundleId}:${filePath}`;

    // Return cached result if available
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    // Load pre-parsed fragments from server
    const preParsedFragments = await this.storageService.loadSourceAnalysis(
      bundle.bundleId,
      filePath,
    );

    // Perform analysis and cache the result
    const result = this.performAnalysisWithFragments(
      bundle,
      filePath,
      preParsedFragments,
    );
    this.analysisCache.set(cacheKey, result);

    return result;
  }

  /**
   * Analyze a source file and extract semantic fragments (synchronous, for computed)
   */
  analyzeSourceFile(
    bundle: BundleAnalysis,
    filePath: string,
  ): SourceAnalysisResult | null {
    // Create cache key from bundleId and file path
    const cacheKey = `${bundle.bundleId}:${filePath}`;

    // Return cached result if available
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    // Perform analysis and cache the result
    const result = this.performAnalysis(bundle, filePath);
    this.analysisCache.set(cacheKey, result);

    return result;
  }

  /**
   * Actually perform the analysis (extracted from analyzeSourceFile)
   */
  private performAnalysis(
    bundle: BundleAnalysis,
    filePath: string,
  ): SourceAnalysisResult | null {
    const sourceContent = getSourceContent(bundle, filePath);
    if (!sourceContent) {
      return null;
    }

    const fileSize = bundle.sourceBreakdown.get(filePath) || 0;
    const { ast, fragments, astNodeLookup } = this.parseSourceFragments(
      sourceContent,
      filePath,
    );

    // Determine which fragments are included in the bundle
    this.markFragmentsInBundle(
      bundle,
      fragments,
      filePath,
      sourceContent,
      fileSize,
    );

    return this.buildAnalysisResult(
      filePath,
      ast,
      astNodeLookup,
      fragments,
      sourceContent,
      fileSize,
    );
  }

  /**
   * Perform analysis using pre-parsed fragments from server
   */
  private performAnalysisWithFragments(
    bundle: BundleAnalysis,
    filePath: string,
    preParsedFragments: any[] | null,
  ): SourceAnalysisResult | null {
    if (!preParsedFragments) {
      return null;
    }

    const sourceContent = getSourceContent(bundle, filePath);
    if (!sourceContent) {
      return null;
    }

    const fileSize = bundle.sourceBreakdown.get(filePath) || 0;
    const fragments: SourceFragment[] = preParsedFragments;

    // We still need to mark which fragments are in the bundle
    this.markFragmentsInBundle(
      bundle,
      fragments,
      filePath,
      sourceContent,
      fileSize,
    );

    // For pre-parsed fragments, we don't have AST or astNodeLookup,
    // but we can still build a basic analysis result
    return this.buildAnalysisResult(
      filePath,
      null,
      new Map(),
      fragments,
      sourceContent,
      fileSize,
    );
  }

  /**
   * Parse source code into semantic fragments
   */
  private parseSourceFragments(
    sourceContent: string,
    filePath: string,
  ): {
    ast: unknown;
    fragments: SourceFragment[];
    astNodeLookup: Map<string, ASTNodeInfo[]>;
  } {
    const fragments: SourceFragment[] = [];
    const fileExtension = this.fileParsers.getFileExtension(filePath);
    let ast = null;
    let astNodeLookup = new Map<string, ASTNodeInfo[]>();

    // Parse based on file type
    switch (fileExtension) {
      case 'ts':
      case 'tsx':
      case 'cjs':
      case 'mjs':
      case 'js':
      case 'jsx':
        const jsResult = this.astParser.parseJavaScriptTypeScript(
          sourceContent,
          fragments,
          filePath,
        );
        ast = jsResult.ast;
        astNodeLookup = jsResult.astNodeLookup;
        break;
      case 'css':
      case 'scss':
      case 'sass':
        this.fileParsers.parseCSSStyleSheets(
          sourceContent.split('\n'),
          fragments,
          filePath,
        );
        break;
      case 'html':
      case 'htm':
        this.fileParsers.parseHTML(
          sourceContent.split('\n'),
          fragments,
          filePath,
        );
        break;
      default:
        this.fileParsers.parseGeneric(
          sourceContent.split('\n'),
          fragments,
          filePath,
        );
    }

    return { ast, fragments, astNodeLookup };
  }

  /**
   * Mark which fragments are included in the bundle using precomputed mapping impacts
   */
  private markFragmentsInBundle(
    bundle: BundleAnalysis,
    fragments: SourceFragment[],
    filePath: string,
    sourceContent: string,
    totalBundleSize: number,
  ): void {
    // Initialize all fragments as not included
    fragments.forEach((fragment) => {
      fragment.isIncludedInBundle = false;
      fragment.bundleSize = 0;
    });

    // Get precomputed mapping impacts for this source file
    const mappingImpacts = getMappingImpacts(bundle, filePath);

    if (mappingImpacts.length === 0) {
      // No mapping impacts found - either no chunks reference this file,
      // or source map processing failed during bundle analysis
      const chunks = getChunksBySource(bundle, filePath);
      if (chunks.length > 0) {
        // File is referenced but no mappings - estimate proportional size
        const fragmentShare = totalBundleSize / fragments.length;
        fragments.forEach((fragment) => {
          fragment.isIncludedInBundle = true;
          fragment.bundleSize = Math.floor(fragmentShare);
        });
      }
      return;
    }

    // Use precomputed mapping impacts to attribute bytes to fragments
    for (const impact of mappingImpacts) {
      if (impact.sizeImpact <= 0) continue;

      // Find ALL fragments that contain this mapping position
      const containingFragments = this.findFragmentsContainingPosition(
        fragments,
        impact.originalLine,
        impact.originalColumn,
      );

      // Attribute the bytes to all containing fragments
      for (const fragment of containingFragments) {
        fragment.isIncludedInBundle = true;
        fragment.bundleSize = (fragment.bundleSize || 0) + impact.sizeImpact;
      }
    }
  }

  /**
   * Build the final analysis result
   */
  private buildAnalysisResult(
    filePath: string,
    ast: unknown,
    astNodeLookup: Map<string, ASTNodeInfo[]>,
    fragments: SourceFragment[],
    sourceContent: string,
    totalBundleSize: number,
  ): SourceAnalysisResult {
    fragments.sort(byFragmentSize);

    const includedFragments = fragments.filter((f) => f.isIncludedInBundle);

    return {
      filePath,
      ast,
      astNodeLookup,
      totalFragments: fragments.length,
      includedFragments: includedFragments.length,
      totalSourceSize: sourceContent.length,
      totalBundleSize,
      fragments,
      imports: fragments.filter((f) => f.type === 'import'),
      exports: fragments.filter((f) => f.type === 'export'),
      classes: fragments.filter((f) => f.type === 'class'),
      methods: fragments.filter((f) => f.type === 'method'),
      functions: fragments.filter((f) => f.type === 'function'),
      variables: fragments.filter((f) => f.type === 'variable'),
      types: fragments.filter(
        (f) => f.type === 'interface' || f.type === 'type' || f.type === 'enum',
      ),
      unusedFragments: fragments.filter((f) => !f.isIncludedInBundle),
    };
  }

  /**
   * Analyze fragment usage across the bundle
   */
  getFragmentUsage(fragment: SourceFragment): FragmentUsage {
    // This would require cross-file analysis to determine usage
    return {
      fragment,
      usageCount: 0,
      referencedBy: [],
      references: [],
    };
  }

  /**
   * Get unused fragments that could be eliminated
   */
  getUnusedFragments(analysisResult: SourceAnalysisResult): SourceFragment[] {
    return analysisResult.unusedFragments.filter(
      (f) => f.type !== 'import' && f.type !== 'export', // Imports/exports might be used differently
    );
  }

  /**
   * Find all fragments that contain the given line/column position
   */
  private findFragmentsContainingPosition(
    fragments: SourceFragment[],
    line: number,
    column: number,
  ): SourceFragment[] {
    // Find all fragments that contain this position
    const containingFragments = fragments.filter((fragment) => {
      // Check if the position is within the fragment's line range
      if (line < fragment.startLine || line > fragment.endLine) {
        return false;
      }

      // If it's on the start line, check that column is at or after start column
      if (line === fragment.startLine && column < fragment.startColumn) {
        return false;
      }

      // If it's on the end line, check that column is before end column
      // Note: endColumn is often 0 for many fragments, so be careful here
      if (
        line === fragment.endLine &&
        fragment.endColumn > 0 &&
        column >= fragment.endColumn
      ) {
        return false;
      }

      return true;
    });

    return containingFragments;
  }
}

/** Sort by bundled (or source) size, largest fragment(s) first. */
function byFragmentSize(a: SourceFragment, b: SourceFragment): number {
  if (a.bundleSize === b.bundleSize) {
    return b.sourceSize - a.sourceSize;
  }
  return (b.bundleSize ?? 0) - (a.bundleSize ?? 0);
}

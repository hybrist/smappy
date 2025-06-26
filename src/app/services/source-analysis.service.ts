import { Injectable, inject } from '@angular/core';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { BundleService } from './bundle.service';
import {
  SourceFragment,
  SourceAnalysisResult,
  FragmentUsage,
  ASTNodeInfo,
} from '../models/source-analysis.models';

@Injectable({
  providedIn: 'root',
})
export class SourceAnalysisService {
  private readonly bundleService = inject(BundleService);

  /**
   * Analyze a source file and extract semantic fragments
   */
  analyzeSourceFile(filePath: string): SourceAnalysisResult | null {
    const sourceContent = this.bundleService.getSourceContent(filePath);
    if (!sourceContent) {
      return null;
    }

    const bundle = this.bundleService.bundle();
    if (!bundle) {
      return null;
    }

    const fileSize = bundle.sourceBreakdown.get(filePath) || 0;
    const { ast, fragments, astNodeLookup } = this.parseSourceFragments(
      sourceContent,
      filePath,
    );

    // Determine which fragments are included in the bundle
    this.markFragmentsInBundle(fragments, filePath, sourceContent, fileSize);

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
    const fileExtension = this.getFileExtension(filePath);
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
        const jsResult = this.parseJavaScriptTypeScript(
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
        ast = this.parseCSSStyleSheets(
          sourceContent.split('\n'),
          fragments,
          filePath,
        );
        break;
      case 'html':
      case 'htm':
        ast = this.parseHTML(sourceContent.split('\n'), fragments, filePath);
        break;
      default:
        ast = this.parseGeneric(sourceContent.split('\n'), fragments, filePath);
    }

    return { ast, fragments, astNodeLookup };
  }

  /**
   * Parse JavaScript/TypeScript files
   */
  private parseJavaScriptTypeScript(
    code: string,
    fragments: SourceFragment[],
    filePath: string,
  ): { ast: unknown; astNodeLookup: Map<string, ASTNodeInfo[]> } {
    const ast = parse(code, {
      sourceFilename: filePath,
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
    });

    const astNodeLookup = new Map<string, ASTNodeInfo[]>();

    // Parse fragments as before
    traverse(ast, {
      enter: (path) => {
        const node = path.node;
        if (!node.loc) return;

        // Build AST node lookup table for fast hover detection
        const nodeInfo: ASTNodeInfo = {
          startLine: node.loc.start.line,
          startColumn: node.loc.start.column,
          endLine: node.loc.end.line,
          endColumn: node.loc.end.column,
          size:
            (node.loc.end.line - node.loc.start.line) * 100 +
            (node.loc.end.column - node.loc.start.column),
        };

        // Create lookup keys for tolerance range around start position
        for (let lineOffset = 0; lineOffset <= 0; lineOffset++) {
          for (let colOffset = -2; colOffset <= 2; colOffset++) {
            const lookupLine = nodeInfo.startLine + lineOffset;
            const lookupCol = Math.max(0, nodeInfo.startColumn + colOffset);
            const key = `${lookupLine}:${lookupCol}`;

            if (!astNodeLookup.has(key)) {
              astNodeLookup.set(key, []);
            }
            astNodeLookup.get(key)!.push(nodeInfo);
          }
        }
      },

      Class: (path) => {
        this.finalizeFragment(
          {
            type: 'class',
            name: path.node.id?.name || 'anonymous',
            startLine: path.node.loc?.start.line || 0,
            startColumn: path.node.loc?.start.column || 0,
          },
          path.node.loc?.end.line || 0,
          fragments,
        );
      },
      Function: (path) => {
        let name: string | undefined;
        if ('key' in path.node && path.node.key.type === 'Identifier') {
          name = name || path.node.key?.name;
        }
        if ('id' in path.node) {
          name = name || path.node.id?.name;
        }
        if (
          path.parentPath.isClassBody() &&
          path.parentPath.parentPath.isClass()
        ) {
          const parentName =
            path.parentPath.parentPath.node.id?.name || 'anonymous';
          name = `${parentName}.${name || 'anonymous'}`;
        }
        this.finalizeFragment(
          {
            type: path.isMethod() ? 'method' : 'function',
            name,
            startLine: path.node.loc?.start.line || 0,
            startColumn: path.node.loc?.start.column || 0,
          },
          path.node.loc?.end.line || 0,
          fragments,
        );
      },
      Statement: (path) => {
        if (!path.parentPath.isProgram()) {
          return;
        }
        if (path.isImportDeclaration()) {
          return;
        }
        if (path.isClassDeclaration() || path.isFunctionDeclaration()) {
          return;
        }
        if (
          path.isExportDefaultDeclaration() &&
          (path.node.declaration.type === 'FunctionDeclaration' ||
            path.node.declaration.type === 'ClassDeclaration')
        ) {
          return;
        }
        if (
          path.isExportNamedDeclaration() &&
          (path.node.declaration?.type === 'FunctionDeclaration' ||
            path.node.declaration?.type === 'ClassDeclaration')
        ) {
          return;
        }
        if (
          (path.isVariableDeclaration() &&
            path.node.declarations.length === 1)
          || (path.isExportNamedDeclaration() && path.node.declaration?.type === 'VariableDeclaration')
        ) {
          let declaration;
          let declarator;
          if (path.isVariableDeclaration()) {
            declaration = path.node;
            declarator = path.node.declarations[0]!;
          } else if (path.node.declaration?.type === 'VariableDeclaration') {
            declaration = path.node.declaration;
            declarator = path.node.declaration.declarations[0]!;
          }

          if (declarator && declaration) {
            if (
              declarator.id.type === 'Identifier' &&
              (declarator.init?.type === 'ClassExpression' ||
                declarator.init?.type === 'FunctionExpression')
            ) {
              // Ignore variable declarations that are class/function expressions.
              // They will already be reported as classes/functions above.
              return;
            }
            const varName = code.slice(declarator.id.start!, declarator.id.end!);
            this.finalizeFragment(
              {
                type: 'unknown',
                name: `${declaration.kind} ${varName}`,
                startLine: path.node.loc?.start.line || 0,
                startColumn: path.node.loc?.start.column || 0,
              },
              path.node.loc?.end.line || 0,
              fragments,
            );
            return;
          }
        }
        if (path.isExpressionStatement()) {
          const expr = code.slice(path.node.expression.start!, path.node.expression.end!);
          this.finalizeFragment(
            {
              type: 'unknown',
              name: expr.length > 20 ? `${expr.slice(0, 20)}...` : expr,
              startLine: path.node.loc?.start.line || 0,
              startColumn: path.node.loc?.start.column || 0,
            },
            path.node.loc?.end.line || 0,
            fragments,
          );
          return;
        }
        this.finalizeFragment(
          {
            type: 'unknown',
            name: `[${path.node.type}]`,
            startLine: path.node.loc?.start.line || 0,
            startColumn: path.node.loc?.start.column || 0,
          },
          path.node.loc?.end.line || 0,
          fragments,
        );
      },
    });

    // Sort nodes by size (largest first) for each lookup key
    for (const nodes of astNodeLookup.values()) {
      nodes.sort((a, b) => b.size - a.size);
    }

    return { ast: ast.program, astNodeLookup };
  }

  /**
   * Parse CSS/SCSS files
   */
  private parseCSSStyleSheets(
    lines: string[],
    fragments: SourceFragment[],
    filePath: string,
  ): void {
    let currentSelector = '';
    let startLine = 0;
    let bracketDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line || line.startsWith('//') || line.startsWith('/*')) continue;

      if (line.includes('{')) {
        if (bracketDepth === 0) {
          currentSelector = line.replace('{', '').trim();
          startLine = i + 1;
        }
        bracketDepth++;
      }

      if (line.includes('}')) {
        bracketDepth--;
        if (bracketDepth === 0 && currentSelector) {
          fragments.push({
            id: `${filePath}:${startLine}`,
            name: currentSelector,
            type: 'unknown', // CSS doesn't have semantic types like JS
            startLine,
            endLine: i + 1,
            startColumn: 0,
            endColumn: line.length,
            sourceSize: this.calculateFragmentSize(lines, startLine - 1, i),
            isIncludedInBundle: true, // Assume CSS is included
          });
          currentSelector = '';
        }
      }
    }
  }

  /**
   * Parse HTML files
   */
  private parseHTML(
    lines: string[],
    fragments: SourceFragment[],
    filePath: string,
  ): void {
    // Simple HTML parsing - could be enhanced with proper HTML parser
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const tagMatch = line.match(/<(\w+)(?:\s|>)/);

      if (tagMatch) {
        fragments.push({
          id: `${filePath}:${i + 1}`,
          name: tagMatch[1],
          type: 'unknown',
          startLine: i + 1,
          endLine: i + 1,
          startColumn: 0,
          endColumn: line.length,
          sourceSize: line.length,
          isIncludedInBundle: true,
        });
      }
    }
  }

  /**
   * Generic parser for unknown file types
   */
  private parseGeneric(
    lines: string[],
    fragments: SourceFragment[],
    filePath: string,
  ): void {
    // For unknown file types, just create one fragment for the entire file
    fragments.push({
      id: `${filePath}:1`,
      name: filePath.split('/').pop() || 'unknown',
      type: 'unknown',
      startLine: 1,
      endLine: lines.length,
      startColumn: 0,
      endColumn: 0,
      sourceSize: lines.join('\n').length,
      isIncludedInBundle: true,
    });
  }

  /**
   * Mark which fragments are included in the bundle using precomputed mapping impacts
   */
  private markFragmentsInBundle(
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
    const mappingImpacts = this.bundleService.getMappingImpacts(filePath);

    if (mappingImpacts.length === 0) {
      // No mapping impacts found - either no chunks reference this file,
      // or source map processing failed during bundle analysis
      const chunks = this.bundleService.getChunksBySource(filePath);
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

  // Helper methods
  private getFileExtension(filePath: string): string {
    return filePath.split('.').pop()?.toLowerCase() || '';
  }

  private finalizeFragment(
    fragment: Partial<SourceFragment>,
    endLine: number,
    fragments: SourceFragment[],
  ): void {
    const name = fragment.name || 'anonymous';
    if (fragment.type && fragment.startLine) {
      const finalFragment: SourceFragment = {
        id: `${name}:${fragment.startLine}:${fragment.startColumn || 0}`,
        name: name,
        type: fragment.type,
        startLine: fragment.startLine,
        endLine,
        startColumn: fragment.startColumn || 0,
        endColumn: 0,
        sourceSize: (endLine - fragment.startLine + 1) * 50, // Rough estimate
        isIncludedInBundle: false, // Will be determined later
        ...fragment,
      };
      fragments.push(finalFragment);
    }
  }

  private calculateFragmentSize(
    lines: string[],
    startIndex: number,
    endIndex: number,
  ): number {
    return lines.slice(startIndex, endIndex + 1).join('\n').length;
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

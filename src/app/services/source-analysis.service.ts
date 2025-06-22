import { Injectable, inject } from '@angular/core';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { BundleService } from './bundle.service';
import {
  SourceFragment,
  SourceAnalysisResult,
  FragmentUsage,
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
    const fragments = this.parseSourceFragments(sourceContent, filePath);

    // Determine which fragments are included in the bundle
    this.markFragmentsInBundle(fragments, sourceContent, fileSize);

    return this.buildAnalysisResult(
      filePath,
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
  ): SourceFragment[] {
    const fragments: SourceFragment[] = [];
    const fileExtension = this.getFileExtension(filePath);

    // Parse based on file type
    switch (fileExtension) {
      case 'ts':
      case 'tsx':
      case 'cjs':
      case 'mjs':
      case 'js':
      case 'jsx':
        this.parseJavaScriptTypeScript(sourceContent, fragments, filePath);
        break;
      case 'css':
      case 'scss':
      case 'sass':
        this.parseCSSStyleSheets(
          sourceContent.split('\n'),
          fragments,
          filePath,
        );
        break;
      case 'html':
      case 'htm':
        this.parseHTML(sourceContent.split('\n'), fragments, filePath);
        break;
      default:
        this.parseGeneric(sourceContent.split('\n'), fragments, filePath);
    }

    return fragments;
  }

  /**
   * Parse JavaScript/TypeScript files
   */
  private parseJavaScriptTypeScript(
    code: string,
    fragments: SourceFragment[],
    filePath: string,
  ): void {
    const ast = parse(code, {
      sourceFilename: filePath,
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
    });

    traverse(ast, {
      Class: (path) => {
        this.finalizeFragment({
          type: 'class',
          name: path.node.id?.name || 'anonymous',
          startLine: path.node.loc?.start.line || 0,
          startColumn: path.node.loc?.start.column || 0,
        }, path.node.loc?.end.line || 0, fragments);
      },
      Function: (path) => {
        console.error('Function node:', path.node);
        let name: string|undefined;
        if ('key' in path.node && path.node.key.type === 'Identifier') {
          name = name || path.node.key?.name;
        }
        if ('id' in path.node) {
          name = name || path.node.id?.name;
        }
        if (path.parentPath.isClassBody() && path.parentPath.parentPath.isClass()) {
          const parentName = path.parentPath.parentPath.node.id?.name || 'anonymous';
          name = `${parentName}.${name || 'anonymous'}`;
        }
        this.finalizeFragment({
          type: path.isMethod() ? 'method' : 'function',
          name,
          startLine: path.node.loc?.start.line || 0,
          startColumn: path.node.loc?.start.column || 0,
        }, path.node.loc?.end.line || 0, fragments);
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
        this.finalizeFragment({
          type: 'unknown',
          name: `[${path.node.type}]`,
          startLine: path.node.loc?.start.line || 0,
          startColumn: path.node.loc?.start.column || 0,
        }, path.node.loc?.end.line || 0, fragments);
      },
    });
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
   * Mark which fragments are included in the bundle
   */
  private markFragmentsInBundle(
    fragments: SourceFragment[],
    sourceContent: string,
    totalBundleSize: number,
  ): void {
    // This is a simplified approach - in reality, we'd need to analyze
    // the source map mappings to determine exact inclusion
    const totalSourceSize = sourceContent.length;
    const inclusionRatio = Math.min(totalBundleSize / totalSourceSize, 1);

    fragments.forEach((fragment) => {
      // Heuristic: assume larger fragments are more likely to be included
      // and imports/exports are almost always included
      const baseInclusionProbability =
        fragment.type === 'import' || fragment.type === 'export' ? 0.9 : 0.5;
      const sizeBonus = Math.min(fragment.sourceSize / 100, 0.4); // Larger fragments more likely included
      const inclusionProbability =
        Math.min(baseInclusionProbability + sizeBonus, 1) * inclusionRatio;

      fragment.isIncludedInBundle = Math.random() < inclusionProbability; // Simplified
      fragment.bundleSize = fragment.isIncludedInBundle
        ? Math.floor(fragment.sourceSize * inclusionRatio)
        : 0;
    });
  }

  /**
   * Build the final analysis result
   */
  private buildAnalysisResult(
    filePath: string,
    fragments: SourceFragment[],
    sourceContent: string,
    totalBundleSize: number,
  ): SourceAnalysisResult {
    const includedFragments = fragments.filter((f) => f.isIncludedInBundle);

    return {
      filePath,
      totalFragments: fragments.length,
      includedFragments: includedFragments.length,
      totalSourceSize: sourceContent.length,
      totalBundleSize,
      fragments,
      imports: fragments.filter((f) => f.type === 'import'),
      exports: fragments.filter((f) => f.type === 'export'),
      classes: fragments.filter((f) => f.type === 'class'),
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
   * Get the most impactful fragments (by bundle size)
   */
  getTopFragmentsBySize(
    analysisResult: SourceAnalysisResult,
    limit = 10,
  ): SourceFragment[] {
    return analysisResult.fragments
      .filter((f) => f.isIncludedInBundle && f.bundleSize)
      .sort((a, b) => (b.bundleSize || 0) - (a.bundleSize || 0))
      .slice(0, limit);
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
}

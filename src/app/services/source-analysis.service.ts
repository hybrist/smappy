import { Injectable, inject } from '@angular/core';
import { SourceMapConsumer } from '@jridgewell/source-map';
import { EachMapping } from '@jridgewell/trace-mapping';
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
    this.markFragmentsInBundle(fragments, filePath, sourceContent, fileSize);

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
          path.isVariableDeclaration() &&
          path.node.declarations.length === 1
        ) {
          const [declaration] = path.node.declarations;
          if (
            declaration.id.type === 'Identifier' &&
            (declaration.init?.type === 'ClassExpression' ||
              declaration.init?.type === 'FunctionExpression')
          ) {
            // Ignore variable declarations that are class/function expressions.
            // They will already be reported as classes/functions above.
            return;
          }
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
    filePath: string,
    sourceContent: string,
    totalBundleSize: number,
  ): void {
    const chunks = this.bundleService.getChunksBySource(filePath);

    // Initialize all fragments as not included
    fragments.forEach((fragment) => {
      fragment.isIncludedInBundle = false;
      fragment.bundleSize = 0;
    });

    for (const chunk of chunks) {
      if (!chunk.sourceMap) {
        continue;
      }

      try {
        const consumer = new SourceMapConsumer(
          chunk.sourceMap as any,
          chunk.fileName,
        );

        // Calculate the actual content size (excluding source map comment)
        const contentWithoutSourceMap = this.getContentWithoutSourceMap(
          chunk.content,
        );
        const lines = contentWithoutSourceMap.split('\n');
        const lineLengths = lines.map((line) => line.length);

        // Collect all mappings for this source file and sort by generated position
        const mappings: EachMapping[] = [];
        consumer.eachMapping((mapping) => {
          mappings.push(mapping);
        });

        // Sort mappings by generated line and column
        mappings.sort((a, b) => {
          if (a.generatedLine !== b.generatedLine) {
            return a.generatedLine - b.generatedLine;
          }
          return a.generatedColumn - b.generatedColumn;
        });

        // Calculate bytes between mappings and attribute to fragments
        for (let i = 0; i < mappings.length; i++) {
          const currentMapping = mappings[i];
          const nextMapping = mappings[i + 1];

          if (
            currentMapping.source !== filePath ||
            !currentMapping.originalLine ||
            !currentMapping.originalColumn
          )
            continue;

          let bytesToAttribute = 0;

          if (nextMapping) {
            // Calculate bytes between current and next mapping
            bytesToAttribute = this.calculateBytesBetweenMappings(
              currentMapping,
              nextMapping,
              lineLengths,
            );
          } else {
            // For the last mapping, calculate bytes to end of content
            bytesToAttribute = this.calculateBytesToEnd(
              currentMapping,
              lineLengths,
            );
          }

          if (bytesToAttribute > 0) {
            // Find the fragments that contains this mapping
            for (const fragment of fragments) {
              if (
                fragment.startLine > currentMapping.originalLine ||
                fragment.endLine < currentMapping.originalLine
              ) {
                continue;
              }
              if (
                fragment.startLine === currentMapping.originalLine &&
                fragment.startColumn > currentMapping.originalColumn
              ) {
                continue;
              }
              if (
                fragment.endLine === currentMapping.originalLine &&
                fragment.endColumn < currentMapping.originalColumn
              ) {
                continue;
              }
              fragment.isIncludedInBundle = true;
              fragment.bundleSize =
                (fragment.bundleSize || 0) + bytesToAttribute;
            }
          }
        }
      } catch (error) {
        console.warn(
          'Error processing source map for chunk',
          chunk.fileName,
          error,
        );
        // If source map processing fails, mark all fragments as potentially included
        // with a proportional size estimate
        const fragmentShare = totalBundleSize / fragments.length;
        fragments.forEach((fragment) => {
          fragment.isIncludedInBundle = true;
          fragment.bundleSize = Math.floor(fragmentShare);
        });
      }
    }
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
    fragments.sort(byFragmentSize);

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
   * Find the fragment that contains a source map mapping
   */
  private findFragmentForMapping(
    fragments: SourceFragment[],
    mapping: EachMapping,
  ): SourceFragment | null {
    if (!mapping.originalLine || !mapping.originalColumn) {
      return null;
    }

    // Find fragments that contain this line/column position
    const candidateFragments = fragments.filter((fragment) => {
      return (
        mapping.originalLine! >= fragment.startLine &&
        mapping.originalLine! <= fragment.endLine
      );
    });

    if (candidateFragments.length === 0) {
      return null;
    }

    // If we have multiple candidates, prefer the most specific one (smallest range)
    candidateFragments.sort((a, b) => {
      const aRange = a.endLine - a.startLine;
      const bRange = b.endLine - b.startLine;
      return aRange - bRange;
    });

    return candidateFragments[0];
  }

  /**
   * Calculate bytes between two mappings (adapted from BundleService)
   */
  private calculateBytesBetweenMappings(
    current: EachMapping,
    next: EachMapping,
    lineLengths: number[],
  ): number {
    let bytes = 0;

    const currentLine = current.generatedLine - 1; // Convert to 0-based
    const currentColumn = current.generatedColumn;
    const nextLine = next.generatedLine - 1; // Convert to 0-based
    const nextColumn = next.generatedColumn;

    if (currentLine === nextLine) {
      // Same line - just count columns
      bytes = Math.max(0, nextColumn - currentColumn);
    } else {
      // Different lines
      // Add remaining characters on current line
      if (currentLine < lineLengths.length) {
        bytes += Math.max(0, lineLengths[currentLine] - currentColumn);
        bytes += 1; // Add newline character
      }

      // Add complete lines in between
      for (
        let line = currentLine + 1;
        line < nextLine && line < lineLengths.length;
        line++
      ) {
        bytes += lineLengths[line] + 1; // +1 for newline
      }

      // Add characters on next line up to next column
      if (nextLine < lineLengths.length) {
        bytes += Math.max(0, nextColumn);
      }
    }

    return bytes;
  }

  /**
   * Calculate bytes from mapping to end of content (adapted from BundleService)
   */
  private calculateBytesToEnd(
    mapping: EachMapping,
    lineLengths: number[],
  ): number {
    let bytes = 0;

    const line = mapping.generatedLine - 1; // Convert to 0-based
    const column = mapping.generatedColumn;

    // Add remaining characters on current line
    if (line < lineLengths.length) {
      bytes += Math.max(0, lineLengths[line] - column);
      bytes += 1; // Add newline character
    }

    // Add all remaining complete lines
    for (let i = line + 1; i < lineLengths.length; i++) {
      bytes += lineLengths[i] + 1; // +1 for newline
    }

    // Remove the last newline if we added one
    if (bytes > 0) {
      bytes -= 1;
    }

    return Math.max(0, bytes);
  }

  /**
   * Get content without source map comment (adapted from BundleService)
   */
  private getContentWithoutSourceMap(content: string): string {
    // Find and remove the source map comment and everything after it
    const sourceMapCommentIndex = content.lastIndexOf('//# sourceMappingURL=');
    if (sourceMapCommentIndex !== -1) {
      // Find the line before the source map comment
      const beforeSourceMap = content.substring(0, sourceMapCommentIndex);
      // Remove trailing whitespace/newlines
      return beforeSourceMap.trimEnd();
    }
    return content;
  }
}

/** Sort by bundled (or source) size, largest fragment(s) first. */
function byFragmentSize(a: SourceFragment, b: SourceFragment): number {
  if (a.bundleSize === b.bundleSize) {
    return b.sourceSize - a.sourceSize;
  }
  return (b.bundleSize ?? 0) - (a.bundleSize ?? 0);
}

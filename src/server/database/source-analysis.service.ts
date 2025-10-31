import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { getDatabase } from './db.js';

/**
 * Server-side types (duplicated from app to avoid cross-boundary imports)
 */
export type FragmentType =
  | 'class'
  | 'function'
  | 'method'
  | 'variable'
  | 'import'
  | 'export'
  | 'interface'
  | 'type'
  | 'enum'
  | 'namespace'
  | 'unknown';

export interface SourceFragment {
  id: string;
  name: string;
  type: FragmentType;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  sourceSize: number;
  bundleSize?: number;
  isIncludedInBundle: boolean;
  description?: string;
  signature?: string;
  accessibility?: 'public' | 'private' | 'protected';
  isStatic?: boolean;
  isAsync?: boolean;
  parameters?: string[];
  returnType?: string;
  dependencies?: string[];
}

/**
 * Server-side source analysis service for pre-parsing source files during bundle upload
 */
export class ServerSourceAnalysisService {
  /**
   * Parse a source file into semantic fragments
   */
  parseSourceFragments(
    sourceContent: string,
    filePath: string,
  ): SourceFragment[] {
    const fragments: SourceFragment[] = [];
    const fileExtension = this.getFileExtension(filePath);

    // Parse based on file type - currently only JS/TS supported on server
    if (this.isJavaScriptTypeScript(fileExtension)) {
      this.parseJavaScriptTypeScript(sourceContent, fragments, filePath);
    }

    return fragments;
  }

  /**
   * Check if file extension is JavaScript or TypeScript
   */
  private isJavaScriptTypeScript(ext: string): boolean {
    return ['ts', 'tsx', 'cjs', 'mjs', 'js', 'jsx'].includes(ext);
  }

  /**
   * Get file extension from path
   */
  private getFileExtension(filePath: string): string {
    const parts = filePath.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * Parse JavaScript/TypeScript code into semantic fragments
   */
  private parseJavaScriptTypeScript(
    code: string,
    fragments: SourceFragment[],
    filePath: string,
  ): void {
    try {
      const ast = parse(code, {
        sourceFilename: filePath,
        sourceType: 'unambiguous',
        plugins: ['jsx', 'typescript', 'decorators'],
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
            (path.isVariableDeclaration() &&
              path.node.declarations.length === 1) ||
            (path.isExportNamedDeclaration() &&
              path.node.declaration?.type === 'VariableDeclaration')
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
                return;
              }
              const varName = code.slice(
                declarator.id.start!,
                declarator.id.end!,
              );
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
            const expr = code.slice(
              path.node.expression.start!,
              path.node.expression.end!,
            );
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
    } catch (error) {
      console.warn(`Failed to parse ${filePath}:`, error);
      // Continue without fragments for this file
    }
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
        sourceSize: (endLine - fragment.startLine + 1) * 50,
        isIncludedInBundle: false,
        ...fragment,
      };
      fragments.push(finalFragment);
    }
  }

  /**
   * Store source analysis for a file in the database
   */
  storeSourceAnalysis(
    bundleId: string,
    filePath: string,
    fragments: SourceFragment[],
  ): void {
    const db = getDatabase();

    try {
      const insertAnalysis = db.prepare(`
        INSERT OR REPLACE INTO source_analysis (bundle_id, file_path, fragments)
        VALUES (?, ?, ?)
      `);

      const fragmentsJson = JSON.stringify(fragments);
      insertAnalysis.run(bundleId, filePath, fragmentsJson);
    } catch (error) {
      console.error(
        `Failed to store source analysis for ${filePath}:`,
        error,
      );
    }
  }

  /**
   * Load source analysis for a file from the database
   */
  loadSourceAnalysis(
    bundleId: string,
    filePath: string,
  ): SourceFragment[] | null {
    const db = getDatabase();

    try {
      const result = db
        .prepare(
          'SELECT fragments FROM source_analysis WHERE bundle_id = ? AND file_path = ?',
        )
        .get(bundleId, filePath) as { fragments: string } | undefined;

      if (result) {
        return JSON.parse(result.fragments);
      }
    } catch (error) {
      console.error(
        `Failed to load source analysis for ${filePath}:`,
        error,
      );
    }

    return null;
  }
}

export const serverSourceAnalysisService = new ServerSourceAnalysisService();

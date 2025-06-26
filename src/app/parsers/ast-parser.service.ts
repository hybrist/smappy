import { Injectable } from '@angular/core';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import {
  SourceFragment,
  ASTNodeInfo,
} from '../models/source-analysis.models';

@Injectable({
  providedIn: 'root',
})
export class AstParserService {
  parseJavaScriptTypeScript(
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

    traverse(ast, {
      enter: (path) => {
        const node = path.node;
        if (!node.loc) return;

        const nodeInfo: ASTNodeInfo = {
          startLine: node.loc.start.line,
          startColumn: node.loc.start.column,
          endLine: node.loc.end.line,
          endColumn: node.loc.end.column,
          size:
            (node.loc.end.line - node.loc.start.line) * 100 +
            (node.loc.end.column - node.loc.start.column),
        };

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

    for (const nodes of astNodeLookup.values()) {
      nodes.sort((a, b) => b.size - a.size);
    }

    return { ast: ast.program, astNodeLookup };
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
}
import path from 'node:path';
import { loadHar } from './loader.ts';
import { extractJavaScript } from './extract-javascript.ts';
import { parse } from '@babel/parser';
import type { ParserPlugin } from '@babel/parser';

const harPath = process.argv[2];
if (!harPath) {
  console.error('Usage: tsx src/har/inspect-class.ts <har-file>');
  process.exit(1);
}

const harFile = path.resolve(harPath);

const astPlugins: ParserPlugin[] = [
  'jsx',
  'typescript',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'decorators-legacy',
  'dynamicImport',
  'importAssertions',
  'topLevelAwait',
];

const main = async () => {
  const har = await loadHar(harFile);
  const extraction = extractJavaScript(har);
  const sample = extraction.scripts.find((script) =>
    script.body.includes('class'),
  );
  if (!sample) {
    console.log('No script with class found');
    return;
  }

  const ast = parse(sample.body, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    plugins: astPlugins,
  });

  const classes: Array<{
    start: number;
    end: number;
    children: Array<{ type: string; start: number; end: number }>;
  }> = [];

  function visit(node: any) {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
      const children = Array.isArray(node.body?.body)
        ? node.body.body.map((child: any) => ({
            type: child.type,
            start: child.start,
            end: child.end,
          }))
        : [];
      classes.push({ start: node.start, end: node.end, children });
    }
    for (const key of Object.keys(node)) {
      const value = (node as any)[key];
      if (Array.isArray(value)) {
        for (const entry of value) {
          visit(entry);
        }
      } else if (value && typeof value === 'object') {
        visit(value);
      }
    }
  }

  visit(ast.program);
  console.log(
    JSON.stringify({ url: sample.url, classes: classes.slice(0, 3) }, null, 2),
  );
};

main();

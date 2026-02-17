import path from 'node:path';
import { parse } from '@babel/parser';
import type { ParserPlugin } from '@babel/parser';
import { loadHar } from './loader.ts';
import { extractJavaScript } from './extract-javascript.ts';

const harPath = process.argv[2];
if (!harPath) {
  console.error('Usage: tsx src/har/find-object-methods.ts <har-file>');
  process.exit(1);
}

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

interface Sample {
  url: string;
  bytes: number;
  snippet: string;
}

const THRESHOLD = 20 * 1024; // 20 KB
const SNIPPET_LENGTH = 400;

const main = async () => {
  const har = await loadHar(path.resolve(harPath));
  const extraction = extractJavaScript(har);
  const samples: Sample[] = [];

  for (const script of extraction.scripts) {
    if (!script.body.includes('{')) {
      continue;
    }
    let ast;
    try {
      ast = parse(script.body, {
        sourceType: 'unambiguous',
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
        plugins: astPlugins,
      });
    } catch (error) {
      console.warn('Failed to parse script', script.url, error);
      continue;
    }

    const visit = (node: any) => {
      if (!node || typeof node !== 'object') {
        return;
      }
      if (node.type === 'ObjectMethod') {
        const start = node.start ?? 0;
        const end = node.end ?? 0;
        if (end > start) {
          const snippet = script.body.slice(start, start + SNIPPET_LENGTH);
          const bytes = Buffer.byteLength(
            script.body.slice(start, end),
            'utf8',
          );
          if (bytes >= THRESHOLD) {
            samples.push({
              url: script.url,
              bytes,
              snippet,
            });
          }
        }
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
    };

    visit(ast.program);
  }

  samples.sort((a, b) => b.bytes - a.bytes);
  const top = samples.slice(0, 5);
  if (!top.length) {
    console.log('No object literal methods larger than threshold found.');
    return;
  }

  for (const sample of top) {
    console.log('---');
    console.log('URL:', sample.url);
    console.log('Size:', `${(sample.bytes / 1024).toFixed(2)} KB`);
    console.log('Snippet:');
    console.log(sample.snippet);
  }
};

await main();

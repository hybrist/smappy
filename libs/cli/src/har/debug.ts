import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadHar } from './loader.ts';
import { extractJavaScript } from './extract-javascript.ts';
import { analyzeSyntax } from './syntax-attribution.ts';

const harPath = process.argv[2];
if (!harPath) {
  console.error('Usage: tsx src/har/debug.ts <har-file>');
  process.exit(1);
}

const main = async () => {
  const har = await loadHar(path.resolve(harPath));
  const extraction = extractJavaScript(har);
  const sample = extraction.scripts.find((script) =>
    script.body.includes('class'),
  );
  if (!sample) {
    console.log('No script with class found');
    return;
  }
  const syntax = analyzeSyntax(sample.body, {
    categories: ['method', 'object_method', 'function', 'class'],
  });
  console.log({ url: sample.url, categories: syntax.categories });
};

main();

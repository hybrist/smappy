# Source Map Processor

This module provides comprehensive source map parsing and position mapping functionality using the `@jridgewell/source-map` library.

## Features

- **Parse Source Maps**: Supports JSON, base64-encoded data URLs, and URL-encoded data URLs
- **Position Mapping**: Maps generated code positions back to original source positions
- **Symbol Fragment Computation**: Calculates byte ranges for symbols in generated output
- **External Map Loading**: Async support for loading .map files from disk
- **Error Handling**: Comprehensive validation and error handling for malformed source maps
- **Multi-Bundler Support**: Works with source maps from webpack, vite, rollup, and other bundlers

## API Reference

### `parseSourceMap(content: string): SourceMap`

Parses a source map from a string. Handles:

- Regular JSON source maps
- Inline base64-encoded data URLs: `data:application/json;charset=utf-8;base64,...`
- URL-encoded data URLs: `data:application/json;charset=utf-8,...`

**Example:**

```typescript
import { parseSourceMap } from './processor.js';

// Parse from JSON
const sourceMap = parseSourceMap(sourceMapJson);

// Parse from base64 data URL
const inlineMap = parseSourceMap('data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozfQ==');
```

### `mapBundleToSource(bundleContent: string, sourceMap: SourceMap): PositionMapping[]`

Creates position mappings from bundle content and source map.

**Example:**

```typescript
import { mapBundleToSource } from './processor.js';

const mappings = mapBundleToSource(bundleContent, sourceMap);
mappings.forEach((mapping) => {
  console.log(
    `Generated: ${mapping.generatedLine}:${mapping.generatedColumn} -> ` +
      `Original: ${mapping.originalLine}:${mapping.originalColumn} in ${mapping.source}`,
  );
});
```

### `computeSymbolFragments(symbol, mappings): SymbolFragment | null`

Computes byte ranges for symbols based on position mappings.

**Example:**

```typescript
import { computeSymbolFragments } from './processor.js';

const symbol = {
  name: 'myFunction',
  location: {
    start: { line: 10, column: 0 },
    end: { line: 15, column: 1 },
  },
};

const fragment = computeSymbolFragments(symbol, mappings);
if (fragment) {
  console.log(`Symbol ${fragment.name} spans from ${fragment.start.line}:${fragment.start.column}`);
}
```

### `computeSymbolFragmentsWithContent(symbol, bundleContent, mappings): SymbolFragment | null`

Enhanced version that calculates accurate byte offsets using bundle content.

**Example:**

```typescript
import { computeSymbolFragmentsWithContent } from './processor.js';

const fragment = computeSymbolFragmentsWithContent(symbol, bundleContent, mappings);
if (fragment) {
  console.log(`Symbol size: ${fragment.size} bytes`);
  console.log(`Byte range: ${fragment.byteStart} - ${fragment.byteEnd}`);
}
```

### `loadExternalSourceMap(mapFilePath, readFile): Promise<SourceMap>`

Loads and parses an external .map file.

**Example:**

```typescript
import { loadExternalSourceMap } from './processor.js';
import { readFile } from 'fs/promises';

const sourceMap = await loadExternalSourceMap('./dist/bundle.js.map', (path) =>
  readFile(path, 'utf-8'),
);
```

## Performance Characteristics

**Note:** The following performance benchmarks are indicative estimates based on typical usage patterns. Actual performance will vary depending on hardware, source map complexity, and system load.

### Parsing Performance

| Source Map Size       | Parse Time (est.) | Memory Usage (est.) |
| --------------------- | ----------------- | ------------------- |
| Small (< 100 KB)      | < 5ms             | ~1 MB               |
| Medium (100-500 KB)   | 10-30ms           | ~5 MB               |
| Large (500 KB - 2 MB) | 50-150ms          | ~15 MB              |
| Very Large (> 2 MB)   | 200-500ms         | ~30 MB              |

**Note:** Times estimated on a modern CPU (2020+). Run your own benchmarks for accurate measurements in your environment.

### Position Mapping Performance

The `mapBundleToSource` function iterates through all mappings in the source map:

- **Small maps** (< 1,000 mappings): < 10ms
- **Medium maps** (1,000-10,000 mappings): 10-50ms
- **Large maps** (10,000-100,000 mappings): 50-500ms
- **Very large maps** (> 100,000 mappings): 500ms-2s

### Symbol Fragment Computation

The `computeSymbolFragments` function performance depends on the number of mappings:

- **O(n)** complexity where n = number of mappings
- Typical performance: 0.1-1ms per symbol for small to medium source maps

### Memory Considerations

- Source maps are fully loaded into memory during parsing
- Position mappings are stored in arrays and can consume significant memory for large maps
- Consider processing large source maps in batches if memory is constrained

## Optimization Tips

1. **Cache parsed source maps**: Parsing is the most expensive operation. Cache results when possible.

2. **Use streaming for very large files**: For source maps > 10 MB, consider streaming approaches.

3. **Batch symbol computations**: Process multiple symbols together to amortize mapping lookup costs.

4. **Limit mapping iterations**: If you only need specific positions, use direct lookups instead of iterating all mappings.

## Error Handling

All functions provide comprehensive error handling:

```typescript
try {
  const sourceMap = parseSourceMap(content);
} catch (error) {
  if (error.message.includes('Invalid source map version')) {
    // Handle version mismatch
  } else if (error.message.includes('Failed to parse source map JSON')) {
    // Handle JSON parsing error
  }
}
```

Common errors:

- `Invalid source map version`: Only version 3 is supported
- `Source map must have a "sources" array`: Missing or invalid sources field
- `Source map must have a "mappings" string`: Missing or invalid mappings field
- `Failed to parse source map JSON`: Malformed JSON
- `Invalid data URL format`: Data URL doesn't match expected format

## Testing

The module includes comprehensive tests covering:

- ✅ Valid and invalid source map parsing
- ✅ Inline source maps (base64 and URL-encoded)
- ✅ Source maps from webpack, vite, and rollup
- ✅ Position mapping with real fixtures
- ✅ Symbol fragment computation
- ✅ Edge cases (missing sources, null mappings)
- ✅ Performance with large source maps
- ✅ External source map loading
- ✅ Error handling for malformed inputs

Run tests with:

```bash
npm test
```

## Browser Compatibility

While this module is designed for server-side use (Node.js), the `@jridgewell/source-map` library is universal and can run in browsers with appropriate bundling.

## Contributing

When adding new features:

1. Add comprehensive tests
2. Update this README with new API documentation
3. Document performance characteristics
4. Ensure 90%+ test coverage
5. Run linter: `npm run lint`

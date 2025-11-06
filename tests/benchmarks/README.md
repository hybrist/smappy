# Performance Benchmarks

This directory contains performance benchmarks for the bundle ingestion and query systems. These benchmarks track performance over time and help detect regressions.

## Overview

The benchmark suite covers:

- **Ingestion Performance**: Speed of ingesting bundles of various sizes (1MB, 10MB, 50MB)
- **AST Analysis Performance**: Speed of analyzing JavaScript/TypeScript modules
- **Query Performance**: Speed of database queries for various operations
- **Database Write Performance**: Speed of persisting analysis results

## Running Benchmarks

### Run all benchmarks:

```bash
pnpm test tests/benchmarks
```

### Run specific benchmark file:

```bash
pnpm test tests/benchmarks/ingestion.bench.ts
pnpm test tests/benchmarks/queries.bench.ts
```

## Performance Targets

### Ingestion Performance

| Bundle Size   | Target Time  | Module Count  |
| ------------- | ------------ | ------------- |
| Small (1MB)   | < 5 seconds  | 50 modules    |
| Medium (10MB) | < 30 seconds | 500 modules   |
| Large (50MB)  | < 2 minutes  | 2,500 modules |

### AST Analysis Performance

| Operation             | Target Time |
| --------------------- | ----------- |
| Analyze single module | < 100ms     |

### Query Performance

| Operation                             | Dataset Size | Target Time |
| ------------------------------------- | ------------ | ----------- |
| `getLatestAnalysis`                   | Small        | < 100ms     |
| `getLatestAnalysis`                   | Large        | < 200ms     |
| `getAnalysisById`                     | Medium       | < 150ms     |
| `getModulesByAnalysis` (first page)   | Medium       | < 200ms     |
| `getModulesByAnalysis` (with filters) | Medium       | < 300ms     |
| `getModulesByAnalysis` (with search)  | Medium       | < 300ms     |
| `getModulesByAnalysis` (large page)   | Large        | < 1000ms    |
| `getSymbolsByModule`                  | Medium       | < 100ms     |
| `getDependencyGraph`                  | Small        | < 500ms     |
| `getDependencyGraph`                  | Medium       | < 2000ms    |
| `getDependencyGraph`                  | Large        | < 10000ms   |
| `compareAnalyses`                     | Small        | < 2000ms    |
| `getAnalysisHistory`                  | Medium       | < 500ms     |

### Database Write Performance

| Operation                  | Target Time |
| -------------------------- | ----------- |
| Write ingestion data (1MB) | < 5 seconds |

## Regression Detection

The CI workflow automatically runs benchmarks and compares results against baseline metrics. If performance regresses by more than 10%, the CI will fail.

### Baseline Metrics

Baseline metrics are stored in `.github/benchmarks/baseline.json`. This file is automatically updated when benchmarks are run successfully.

## Performance Optimization Tips

### Ingestion Performance

- Use incremental analysis when possible to skip unchanged modules
- Consider parallel processing for large datasets
- Optimize AST analysis for common patterns

### Query Performance

- Use pagination for large result sets
- Add appropriate database indexes
- Cache frequently accessed data

### Database Write Performance

- Use transactions for batch writes
- Consider bulk insert operations
- Optimize schema for write-heavy workloads

## Contributing

When adding new benchmarks:

1. Add benchmark tests to the appropriate file (`ingestion.bench.ts` or `queries.bench.ts`)
2. Update this README with performance targets
3. Ensure benchmarks are deterministic and repeatable
4. Use appropriate timeout values for large operations
5. Document any assumptions or limitations

## Notes

- Benchmarks use in-memory databases to ensure consistency
- Test data is generated programmatically to ensure reproducibility
- Benchmarks may take several minutes to complete, especially for large datasets
- Performance may vary based on system resources and load

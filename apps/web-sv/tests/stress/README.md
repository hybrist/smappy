# Stress Tests

This directory contains stress tests for the bundle ingestion system to validate behavior under extreme conditions.

## Test Scenarios

### Large Bundles (`large-bundle.spec.ts`)

Tests system behavior with extremely large bundles (>100MB):

- Validates system handles 100MB+ bundles without crashing
- Ensures memory usage stays reasonable
- Tests graceful degradation when limits are exceeded

### Many Modules (`many-modules.spec.ts`)

Tests system with projects containing thousands of modules:

- Validates processing of 10,000+ modules
- Ensures reasonable performance and memory usage
- Tests database write performance with large datasets

### Deep Dependencies (`deep-dependencies.spec.ts`)

Tests system with very deep dependency trees:

- Validates handling of dependency trees >20 levels deep
- Ensures no stack overflow occurs
- Tests graph building algorithms with deep hierarchies

### Concurrent Ingestion

Tests concurrent ingestion operations:

- Validates system handles multiple concurrent ingestion requests
- Ensures database transaction safety
- Tests for race conditions and data consistency

### Memory Usage

Monitors and validates memory usage under stress:

- Tracks memory consumption during large operations
- Validates memory is properly released after operations
- Ensures no memory leaks under prolonged load

## Running Stress Tests

```bash
# Run all stress tests
pnpm test tests/stress

# Run specific stress test file
pnpm test tests/stress/large-bundle.spec.ts

# Run with increased timeout (stress tests may take longer)
pnpm test tests/stress --test-timeout=300000
```

## Performance Expectations

Stress tests are designed to:

- Complete within reasonable timeframes (< 5 minutes for full suite)
- Use memory efficiently (< 2GB for largest test cases)
- Not crash the system under any tested conditions
- Provide meaningful error messages when limits are exceeded

## Environment Variables

- `STRESS_TEST_TIMEOUT` - Override default test timeout (default: 300000ms)
- `STRESS_TEST_MEMORY_LIMIT` - Maximum memory usage in MB (default: 2048MB)

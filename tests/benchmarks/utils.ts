/**
 * Benchmark utilities for performance testing
 */

export interface BenchmarkResult {
  name: string;
  duration: number; // milliseconds
  iterations?: number;
  opsPerSecond?: number;
}

export interface BenchmarkSuite {
  results: BenchmarkResult[];
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
}

/**
 * Run a benchmark function multiple times and collect statistics
 */
export async function benchmark(
  name: string,
  fn: () => Promise<void> | void,
  iterations: number = 5,
): Promise<BenchmarkResult> {
  const durations: number[] = [];

  // Warm-up run (not counted)
  await fn();

  // Actual benchmark runs
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    durations.push(end - start);
  }

  const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const opsPerSecond = 1000 / averageDuration;

  return {
    name,
    duration: averageDuration,
    iterations,
    opsPerSecond,
  };
}

/**
 * Run multiple benchmarks and collect suite statistics
 */
export async function runBenchmarkSuite(
  benchmarks: Array<{ name: string; fn: () => Promise<void> | void; iterations?: number }>,
): Promise<BenchmarkSuite> {
  const results: BenchmarkResult[] = [];

  for (const bench of benchmarks) {
    const result = await benchmark(bench.name, bench.fn, bench.iterations ?? 5);
    results.push(result);
  }

  const durations = results.map((r) => r.duration);
  const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  return {
    results,
    averageDuration,
    minDuration,
    maxDuration,
  };
}

/**
 * Format benchmark result for display
 */
export function formatBenchmarkResult(result: BenchmarkResult): string {
  return `${result.name}: ${result.duration.toFixed(2)}ms (${result.opsPerSecond?.toFixed(2)} ops/sec)`;
}

/**
 * Format benchmark suite for display
 */
export function formatBenchmarkSuite(suite: BenchmarkSuite): string {
  const lines = [
    'Benchmark Suite Results:',
    `Average: ${suite.averageDuration.toFixed(2)}ms`,
    `Min: ${suite.minDuration.toFixed(2)}ms`,
    `Max: ${suite.maxDuration.toFixed(2)}ms`,
    '',
    'Individual Results:',
    ...suite.results.map(formatBenchmarkResult),
  ];
  return lines.join('\n');
}

/**
 * Check if a benchmark result exceeds a threshold (for regression detection)
 */
export function exceedsThreshold(
  current: number,
  baseline: number,
  thresholdPercent: number = 10,
): boolean {
  const threshold = baseline * (1 + thresholdPercent / 100);
  return current > threshold;
}

/**
 * Basic integration test to verify the ingestion module exports are working
 * Note: Comprehensive end-to-end tests are in index.spec.ts
 */
import { describe, it, expect } from 'vitest';
import { ingestBundle } from './index.js';

describe('Ingestion module setup', () => {
  it('should export ingestBundle function', () => {
    expect(ingestBundle).toBeDefined();
    expect(typeof ingestBundle).toBe('function');
  });

  // Note: Full end-to-end tests with database mocking are in index.spec.ts
  // This file just verifies basic exports
});

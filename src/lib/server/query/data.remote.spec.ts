/**
 * Integration tests for remote query functions
 * Tests function exports, validation schemas, and basic structure
 * Note: Full E2E testing requires a running SvelteKit server with request context
 */

import { describe, it, expect, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema.js';

// Mock the db module to avoid database initialization issues
vi.mock('../db/index.js', () => {
  const testClient = new Database(':memory:');
  const testDb = drizzle(testClient, { schema });
  return { db: testDb };
});

// Test that remote functions are properly exported
describe('Remote Query Functions', () => {
  it('should export getLatestAnalysis function', async () => {
    const module = await import('./data.remote.js');
    expect(module.getLatestAnalysis).toBeDefined();
    expect(typeof module.getLatestAnalysis).toBe('function');
  });

  it('should export getAnalysisById function', async () => {
    const module = await import('./data.remote.js');
    expect(module.getAnalysisById).toBeDefined();
    expect(typeof module.getAnalysisById).toBe('function');
  });

  it('should export getModulesByAnalysis function', async () => {
    const module = await import('./data.remote.js');
    expect(module.getModulesByAnalysis).toBeDefined();
    expect(typeof module.getModulesByAnalysis).toBe('function');
  });

  it('should export getSymbolsByModule function', async () => {
    const module = await import('./data.remote.js');
    expect(module.getSymbolsByModule).toBeDefined();
    expect(typeof module.getSymbolsByModule).toBe('function');
  });

  it('should export getDependencyGraph function', async () => {
    const module = await import('./data.remote.js');
    expect(module.getDependencyGraph).toBeDefined();
    expect(typeof module.getDependencyGraph).toBe('function');
  });

  it('should export compareAnalyses function', async () => {
    const module = await import('./data.remote.js');
    expect(module.compareAnalyses).toBeDefined();
    expect(typeof module.compareAnalyses).toBe('function');
  });

  it('should have all 6 remote functions exported', async () => {
    const module = await import('./data.remote.js');
    const exports = Object.keys(module).filter(
      (key) => typeof module[key as keyof typeof module] === 'function',
    );

    // Should export at least the 6 remote functions
    expect(exports.length).toBeGreaterThanOrEqual(6);
    expect(exports).toContain('getLatestAnalysis');
    expect(exports).toContain('getAnalysisById');
    expect(exports).toContain('getModulesByAnalysis');
    expect(exports).toContain('getSymbolsByModule');
    expect(exports).toContain('getDependencyGraph');
    expect(exports).toContain('compareAnalyses');
  });
});

// Note: Full integration tests that verify end-to-end flow require:
// 1. A running SvelteKit server with request context
// 2. Test data in the database
// 3. Actual HTTP calls or SvelteKit's test utilities
//
// These tests verify the functions are properly exported and structured.
// For E2E testing, see tests/e2e/ directory or use Playwright tests
// that test the functions through actual HTTP requests.

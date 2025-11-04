/**
 * Integration test to verify the ingestion module is properly set up
 */
import { describe, it, expect } from 'vitest';
import { ingestBundle } from './index.js';
import type { Bundle } from './types/index.js';

describe('Ingestion module setup', () => {
	it('should export ingestBundle function', () => {
		expect(ingestBundle).toBeDefined();
		expect(typeof ingestBundle).toBe('function');
	});

	it('should process a simple bundle', async () => {
		const bundle: Bundle = {
			id: 'test-bundle',
			path: 'test.js',
			content: 'console.log("Hello, world!");'
		};

		const result = await ingestBundle(bundle);

		expect(result).toBeDefined();
		expect(result.bundleId).toBe('test-bundle');
		expect(result.sizes).toBeDefined();
		expect(result.sizes.total).toBeGreaterThan(0);
	});
});

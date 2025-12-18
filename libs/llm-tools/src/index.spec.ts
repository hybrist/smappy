import { describe, it, expect } from 'vitest';
import { createBundleTools } from './index.js';

describe('createBundleTools', () => {
  it('requires a store or db instance', () => {
    expect(() =>
      createBundleTools({
        analysisId: 1,
        bundle: { id: 1 },
      }),
    ).toThrow(/store or database instance/i);
  });
});

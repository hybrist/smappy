import { describe, it, expect } from 'vitest';
import { matchesKey, formatKeyForDisplay } from './keyboard-shortcuts';

describe('keyboard-shortcuts utility', () => {
  describe('matchesKey', () => {
    it('should match identical keys', () => {
      expect(matchesKey('a', 'a')).toBe(true);
    });

    it('should match case-insensitively', () => {
      expect(matchesKey('a', 'A')).toBe(true);
    });

    it('should match with modifiers', () => {
      expect(matchesKey('mod+k', 'mod+k')).toBe(true);
    });

    it('should not match different keys', () => {
      expect(matchesKey('a', 'b')).toBe(false);
    });
  });

  describe('formatKeyForDisplay', () => {
    it('should format simple keys', () => {
      const result = formatKeyForDisplay('a');
      expect(result).toBe('A');
    });

    it('should format escape key', () => {
      const result = formatKeyForDisplay('esc');
      expect(result).toBe('Esc');
    });

    it('should format question mark', () => {
      const result = formatKeyForDisplay('?');
      expect(result).toBe('?');
    });

    it('should format sequence keys', () => {
      const result = formatKeyForDisplay('g+d');
      expect(result).toMatch(/G.*D/);
    });
  });
});

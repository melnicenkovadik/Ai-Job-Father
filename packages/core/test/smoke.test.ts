import { describe, expect, it } from 'vitest';
import { CORE_VERSION } from '../src';

describe('core', () => {
  it('exports CORE_VERSION', () => {
    expect(CORE_VERSION).toBe('0.0.1');
  });
});

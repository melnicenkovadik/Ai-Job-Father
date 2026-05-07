import { describe, expect, it } from 'vitest';
import { canStepAdvance } from './can-step-advance';
import { EMPTY_WIZARD_DRAFT } from './draft-store';

const empty = EMPTY_WIZARD_DRAFT;

describe('canStepAdvance', () => {
  it('blocks profile step until profileId is set', () => {
    expect(canStepAdvance('profile', empty)).toBe(false);
    expect(
      canStepAdvance('profile', { ...empty, profileId: '00000000-0000-0000-0000-000000000001' }),
    ).toBe(true);
  });

  it('blocks category step until a category is picked', () => {
    expect(canStepAdvance('category', empty)).toBe(false);
    expect(canStepAdvance('category', { ...empty, category: 'tech' })).toBe(true);
  });

  it('blocks roles step until at least one role is selected', () => {
    expect(canStepAdvance('roles', empty)).toBe(false);
    expect(canStepAdvance('roles', { ...empty, roles: ['Frontend Engineer'] })).toBe(true);
  });

  it('blocks countries step until at least one country', () => {
    expect(canStepAdvance('countries', empty)).toBe(false);
    expect(canStepAdvance('countries', { ...empty, countries: ['DE'] })).toBe(true);
  });

  describe('salary step', () => {
    it('rejects unset salary range', () => {
      expect(canStepAdvance('salary', empty)).toBe(false);
    });
    it('rejects min below 400', () => {
      expect(canStepAdvance('salary', { ...empty, salaryMin: 200, salaryMax: 1000 })).toBe(false);
    });
    it('rejects inverted range (max < min)', () => {
      expect(canStepAdvance('salary', { ...empty, salaryMin: 5000, salaryMax: 4000 })).toBe(false);
    });
    it('accepts valid range starting at 400', () => {
      expect(canStepAdvance('salary', { ...empty, salaryMin: 400, salaryMax: 1500 })).toBe(true);
    });
  });

  it('blocks stack step until at least one tool is picked', () => {
    expect(canStepAdvance('stack', empty)).toBe(false);
    expect(canStepAdvance('stack', { ...empty, stack: ['React'] })).toBe(true);
  });

  it('blocks languages step until at least one is selected', () => {
    expect(canStepAdvance('languages', empty)).toBe(false);
    expect(canStepAdvance('languages', { ...empty, languages: ['EN'] })).toBe(true);
  });

  describe('quota step', () => {
    it('rejects out-of-range quota', () => {
      expect(canStepAdvance('quota', { ...empty, quota: 5 })).toBe(false);
      expect(canStepAdvance('quota', { ...empty, quota: 200 })).toBe(false);
    });
    it('accepts inclusive bounds', () => {
      expect(canStepAdvance('quota', { ...empty, quota: 10 })).toBe(true);
      expect(canStepAdvance('quota', { ...empty, quota: 100 })).toBe(true);
    });
  });

  it('checkout step requires category present (downstream price needs it)', () => {
    expect(canStepAdvance('checkout', empty)).toBe(false);
    expect(canStepAdvance('checkout', { ...empty, category: 'design' })).toBe(true);
  });
});

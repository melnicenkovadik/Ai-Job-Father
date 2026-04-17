import { describe, expect, it } from 'vitest';
import {
  CEFR_LEVELS,
  type CefrLevel,
  InvalidProfileError,
  Profile,
  ProfileId,
  type ProfileState,
  isCefrLevel,
} from './profile';

const baseState: ProfileState = {
  id: ProfileId.from('prof-1'),
  userId: 'user-1',
  name: 'Frontend EU',
  isDefault: true,
  preferredCategories: ['tech'],
  headline: 'Senior Frontend Engineer',
  yearsTotal: 10,
  skills: [
    { name: 'React', years: 8 },
    { name: 'TypeScript', years: 6 },
  ],
  experience: [],
  education: [],
  languages: [{ code: 'en', level: 'C1' }],
  categoryFields: {},
  createdAt: new Date('2026-04-17T00:00:00Z'),
  updatedAt: new Date('2026-04-17T00:00:00Z'),
};

describe('ProfileId', () => {
  it('accepts non-empty strings', () => {
    expect(ProfileId.from('abc').value).toBe('abc');
  });

  it('rejects empty string', () => {
    expect(() => ProfileId.from('')).toThrow(InvalidProfileError);
  });

  it('equals compares by value', () => {
    expect(ProfileId.from('a').equals(ProfileId.from('a'))).toBe(true);
    expect(ProfileId.from('a').equals(ProfileId.from('b'))).toBe(false);
  });
});

describe('CefrLevel', () => {
  it.each(CEFR_LEVELS)('accepts %s', (level) => {
    expect(isCefrLevel(level)).toBe(true);
  });

  it.each(['', 'A0', 'c1', 'D1', 42, null, undefined])('rejects %p', (bad) => {
    expect(isCefrLevel(bad)).toBe(false);
  });
});

describe('Profile.rehydrate — validation', () => {
  it('accepts a fully-populated valid state', () => {
    const p = Profile.rehydrate(baseState);
    expect(p.name).toBe('Frontend EU');
    expect(p.preferredCategories).toEqual(['tech']);
    expect(p.yearsTotal).toBe(10);
  });

  it('rejects empty name', () => {
    expect(() => Profile.rehydrate({ ...baseState, name: '' })).toThrow(InvalidProfileError);
  });

  it('rejects name > 40 chars', () => {
    expect(() => Profile.rehydrate({ ...baseState, name: 'x'.repeat(41) })).toThrow(
      InvalidProfileError,
    );
  });

  it('rejects yearsTotal < 0 or > 80', () => {
    expect(() => Profile.rehydrate({ ...baseState, yearsTotal: -1 })).toThrow(InvalidProfileError);
    expect(() => Profile.rehydrate({ ...baseState, yearsTotal: 81 })).toThrow(InvalidProfileError);
  });

  it('rejects unknown preferred category', () => {
    expect(() =>
      Profile.rehydrate({
        ...baseState,
        preferredCategories: [
          'healthcare' as unknown as (typeof baseState.preferredCategories)[number],
        ],
      }),
    ).toThrow(InvalidProfileError);
  });

  it('rejects invalid englishLevel', () => {
    expect(() =>
      Profile.rehydrate({ ...baseState, englishLevel: 'D1' as unknown as CefrLevel }),
    ).toThrow(InvalidProfileError);
  });

  it('rejects invalid language level', () => {
    expect(() =>
      Profile.rehydrate({
        ...baseState,
        languages: [{ code: 'en', level: 'foo' as unknown as CefrLevel }],
      }),
    ).toThrow(InvalidProfileError);
  });
});

describe('Profile.isCampaignReady', () => {
  it('true when name + at least 1 skill + headline set', () => {
    expect(Profile.rehydrate(baseState).isCampaignReady()).toBe(true);
  });

  it('false on no skills', () => {
    expect(Profile.rehydrate({ ...baseState, skills: [] }).isCampaignReady()).toBe(false);
  });

  it('false on empty headline + no yearsTotal', () => {
    expect(
      Profile.rehydrate({
        ...baseState,
        headline: undefined,
        yearsTotal: undefined,
      }).isCampaignReady(),
    ).toBe(false);
  });

  it('true with yearsTotal even if headline empty', () => {
    expect(
      Profile.rehydrate({
        ...baseState,
        headline: undefined,
        yearsTotal: 5,
      }).isCampaignReady(),
    ).toBe(true);
  });
});

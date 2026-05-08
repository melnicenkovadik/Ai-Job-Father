import { describe, expect, it } from 'vitest';
import { PROFILE_TINT_PALETTE_SIZE, profileTint } from './tint';

describe('profileTint', () => {
  it('is deterministic — same name returns same tint', () => {
    const a = profileTint('WITH AI');
    const b = profileTint('WITH AI');
    expect(a).toEqual(b);
  });

  it('returns a stable fallback tint for nullish / empty names', () => {
    // All three nullish-ish inputs share one bucket so an unset name
    // never produces a flicker on first render.
    const fromUndefined = profileTint(undefined);
    const fromNull = profileTint(null);
    const fromEmpty = profileTint('');
    expect(fromUndefined.border).toBe(fromNull.border);
    expect(fromUndefined.border).toBe(fromEmpty.border);
  });

  it('produces different tints for "WITH AI" vs "WITHout AI"', () => {
    // The actual problem case from the user's profiles list — these
    // two names must NOT collide on the same colour bucket.
    expect(profileTint('WITH AI').border).not.toBe(profileTint('WITHout AI').border);
  });

  it('every palette entry is reachable across a sweep of short names', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(profileTint(`profile-${i}`).border);
    }
    expect(seen.size).toBe(PROFILE_TINT_PALETTE_SIZE);
  });
});

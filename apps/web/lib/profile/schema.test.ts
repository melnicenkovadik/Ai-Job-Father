import { describe, expect, it } from 'vitest';
import { profileDraftSchema } from './schema';

const NUL = String.fromCharCode(0);
const BEL = String.fromCharCode(7);

describe('profileDraftSchema — null-byte sanitisation', () => {
  it('strips NUL from required name', () => {
    const out = profileDraftSchema.parse({ name: `Vadym${NUL}` });
    expect(out.name).toBe('Vadym');
  });

  it('strips NUL from optional fields (fullName/headline/summary)', () => {
    const out = profileDraftSchema.parse({
      name: 'Default',
      fullName: `Vadym${NUL} Melnychenko`,
      headline: `Senior Frontend${BEL} Developer`,
      summary: `Hands-on engineer${NUL}.`,
    });
    expect(out.fullName).toBe('Vadym Melnychenko');
    expect(out.headline).toBe('Senior Frontend Developer');
    expect(out.summary).toBe('Hands-on engineer.');
  });

  it('strips NUL from skill names', () => {
    const out = profileDraftSchema.parse({
      name: 'Default',
      skills: [{ name: `React${NUL}` }, { name: `TypeScript${BEL}` }],
    });
    expect(out.skills.map((s) => s.name)).toEqual(['React', 'TypeScript']);
  });

  it('strips NUL from experience.company / role / description / stack', () => {
    const out = profileDraftSchema.parse({
      name: 'Default',
      experience: [
        {
          company: `Acme${NUL} Corp`,
          role: `Senior Eng${BEL}`,
          startMonth: '2022-01',
          endMonth: null,
          description: `Built things${NUL}.`,
          stack: [`React${NUL}`, `TS${BEL}`],
        },
      ],
    });
    const exp = out.experience[0];
    expect(exp).toBeDefined();
    if (!exp) return;
    expect(exp.company).toBe('Acme Corp');
    expect(exp.role).toBe('Senior Eng');
    expect(exp.description).toBe('Built things.');
    expect(exp.stack).toEqual(['React', 'TS']);
  });

  it('strips NUL from education.school / degree', () => {
    const out = profileDraftSchema.parse({
      name: 'Default',
      education: [
        {
          school: `KPI${NUL}`,
          degree: `BSc${BEL}`,
        },
      ],
    });
    const edu = out.education[0];
    expect(edu).toBeDefined();
    if (!edu) return;
    expect(edu.school).toBe('KPI');
    expect(edu.degree).toBe('BSc');
  });

  it('strips NUL from email and rejects malformed result', () => {
    expect(() =>
      profileDraftSchema.parse({
        name: 'Default',
        email: `not-an-email${NUL}`,
      }),
    ).toThrow();
    const ok = profileDraftSchema.parse({
      name: 'Default',
      email: `vadym${NUL}@example.com`,
    });
    expect(ok.email).toBe('vadym@example.com');
  });

  it('produces output safe to JSON-stringify (no escaped NUL)', () => {
    const out = profileDraftSchema.parse({
      name: `n${NUL}`,
      fullName: `f${NUL}`,
      summary: `s${NUL}`,
      skills: [{ name: `k${NUL}` }],
      experience: [
        {
          company: `c${NUL}`,
          role: `r${NUL}`,
          startMonth: '2020-01',
          endMonth: null,
        },
      ],
    });
    expect(JSON.stringify(out)).not.toContain('\\u0000');
  });
});

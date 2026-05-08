import { describe, expect, it } from 'vitest';
import { classifyLinks } from './extract-links';

describe('classifyLinks', () => {
  it('extracts LinkedIn personal profile URL', () => {
    const r = classifyLinks(['https://www.linkedin.com/in/melnychenkovad/?locale=en_US']);
    expect(r.linkedinUrl).toBe('https://www.linkedin.com/in/melnychenkovad');
  });

  it('rejects LinkedIn company URLs (only /in/<handle> wins)', () => {
    const r = classifyLinks(['https://www.linkedin.com/company/anthropic']);
    expect(r.linkedinUrl).toBeUndefined();
    expect(r.otherUrls).toContain('https://www.linkedin.com/company/anthropic');
  });

  it('extracts GitHub user, ignores org/repo paths', () => {
    const r = classifyLinks([
      'https://github.com/melnicenkovadik',
      'https://github.com/some-org/some-repo',
    ]);
    expect(r.githubUrl).toBe('https://github.com/melnicenkovadik');
    expect(r.otherUrls).toContain('https://github.com/some-org/some-repo');
  });

  it('extracts Telegram (t.me) profile', () => {
    const r = classifyLinks(['https://t.me/melnychenkovad']);
    expect(r.telegramUrl).toBe('https://t.me/melnychenkovad');
  });

  it('extracts Twitter / X profile', () => {
    const r1 = classifyLinks(['https://twitter.com/handle']);
    const r2 = classifyLinks(['https://x.com/handle']);
    expect(r1.twitterUrl).toBe('https://twitter.com/handle');
    expect(r2.twitterUrl).toBe('https://x.com/handle');
  });

  it('extracts mailto email', () => {
    const r = classifyLinks(['mailto:melnicenkovadik@gmail.com?subject=hi']);
    expect(r.email).toBe('melnicenkovadik@gmail.com');
  });

  it('takes the first LinkedIn URL when multiple are present', () => {
    const r = classifyLinks([
      'https://www.linkedin.com/in/melnychenkovad/',
      'https://www.linkedin.com/in/dmitriy-nizkoshapka/',
      'https://www.linkedin.com/in/illia-morhachov/',
    ]);
    expect(r.linkedinUrl).toBe('https://www.linkedin.com/in/melnychenkovad');
  });

  it('puts everything unclassified into otherUrls', () => {
    const r = classifyLinks([
      'https://www.trustyfy.com/',
      'https://www.harvey.ai/',
      'https://www.linkedin.com/in/handle/',
    ]);
    expect(r.linkedinUrl).toBe('https://www.linkedin.com/in/handle');
    expect(r.otherUrls).toEqual(['https://www.trustyfy.com', 'https://www.harvey.ai']);
  });

  it('infers portfolio only when there is exactly one non-social URL and no LinkedIn/GitHub', () => {
    expect(classifyLinks(['https://vadym.dev']).portfolioUrl).toBe('https://vadym.dev');
    // Multiple non-social URLs → ambiguous, no guess
    expect(
      classifyLinks(['https://trustyfy.com', 'https://harvey.ai']).portfolioUrl,
    ).toBeUndefined();
    // LinkedIn present → don't guess portfolio from leftovers
    expect(
      classifyLinks(['https://linkedin.com/in/me', 'https://harvey.ai']).portfolioUrl,
    ).toBeUndefined();
  });

  it('drops malformed URLs and dedupes', () => {
    const r = classifyLinks([
      'not-a-url',
      'javascript:alert(1)',
      'https://github.com/me',
      'https://github.com/me', // duplicate
      '',
    ]);
    expect(r.githubUrl).toBe('https://github.com/me');
    expect(r.otherUrls).toEqual([]);
  });

  it('full Vadym CV fixture', () => {
    // Real annotations pulled from the user's PDF — see /tmp/cv-test/probe-unpdf.ts run.
    const r = classifyLinks([
      'https://www.linkedin.com/in/melnychenkovad/?locale=en_US',
      'https://github.com/melnicenkovadik',
      'https://t.me/melnychenkovad',
      'mailto:melnicenkovadik@gmail.com',
      'https://www.trustyfy.com/',
      'https://www.harvey.ai/',
      'https://www.optimism.io/',
      'https://prof-it.bz/',
      'https://patex.io/',
      'https://www.coinbase.com/',
      'https://inc4.net/',
      'https://ambrosus.io/',
      'https://www.linkedin.com/in/dmitriy-nizkoshapka/', // testimonial 1 — should NOT win
      'https://www.linkedin.com/in/illia-morhachov/',
      'https://www.linkedin.com/in/kratoscrypto/',
    ]);
    expect(r.linkedinUrl).toBe('https://www.linkedin.com/in/melnychenkovad');
    expect(r.githubUrl).toBe('https://github.com/melnicenkovadik');
    expect(r.telegramUrl).toBe('https://t.me/melnychenkovad');
    expect(r.email).toBe('melnicenkovadik@gmail.com');
    // 8 company URLs survive in otherUrls (in order).
    expect(r.otherUrls).toHaveLength(8);
    expect(r.otherUrls[0]).toBe('https://www.trustyfy.com');
  });
});

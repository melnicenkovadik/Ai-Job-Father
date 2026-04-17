import { describe, expect, it } from 'vitest';
import { extractContacts } from './extract-contacts';

describe('extractContacts', () => {
  it('finds email, phone, linkedin, github, portfolio', () => {
    const text = [
      'Vadym Melnychenko',
      'vadym@example.com · +39 555 123 4567',
      'https://linkedin.com/in/vadym-m',
      'github.com/melnicenkovadik',
      'https://vadym.dev',
    ].join('\n');
    const c = extractContacts(text);
    expect(c.email).toBe('vadym@example.com');
    expect(c.phone).toContain('555');
    expect(c.linkedinUrl).toBe('https://linkedin.com/in/vadym-m');
    expect(c.githubUrl).toBe('https://github.com/melnicenkovadik');
    expect(c.portfolioUrl).toBe('https://vadym.dev');
  });

  it('normalizes linkedin URL without scheme', () => {
    const text = 'www.linkedin.com/in/jane';
    const c = extractContacts(text);
    expect(c.linkedinUrl).toBe('https://www.linkedin.com/in/jane');
  });

  it('returns undefined for unknown fields', () => {
    const text = 'Just a paragraph about something.';
    const c = extractContacts(text);
    expect(c.email).toBeUndefined();
    expect(c.phone).toBeUndefined();
    expect(c.linkedinUrl).toBeUndefined();
    expect(c.githubUrl).toBeUndefined();
    expect(c.portfolioUrl).toBeUndefined();
  });

  it('rejects phone-like substrings that are really year ranges', () => {
    const text = 'Worked at Acme 2018-2024.';
    expect(extractContacts(text).phone).toBeUndefined();
  });

  it('rejects phones that are too short', () => {
    expect(extractContacts('Tel: 123 456').phone).toBeUndefined();
  });

  it('rejects phones that are too long', () => {
    expect(extractContacts('ref 1234567890123456789').phone).toBeUndefined();
  });

  it('accepts phone with parens + hyphens', () => {
    const c = extractContacts('Call me at +1 (555) 123-4567 anytime');
    expect(c.phone).toContain('555');
    expect(c.phone).toContain('4567');
  });

  it('strips trailing punctuation from portfolio URLs', () => {
    const c = extractContacts('Portfolio: https://vadym.dev, more info below.');
    expect(c.portfolioUrl).toBe('https://vadym.dev');
  });

  it('does not return linkedin or github as portfolio', () => {
    const text = 'linkedin.com/in/a github.com/b https://other.dev';
    const c = extractContacts(text);
    expect(c.portfolioUrl).toBe('https://other.dev');
  });
});

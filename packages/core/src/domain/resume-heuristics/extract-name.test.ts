import { describe, expect, it } from 'vitest';
import { extractNameHeadlineSummary } from './extract-name';

describe('extractNameHeadlineSummary', () => {
  it('pulls name + headline from a standard English header block', () => {
    const header = [
      'Vadym Melnychenko',
      'Senior Frontend Developer',
      'vadym@example.com · +39 555 123 4567',
      'https://linkedin.com/in/vadym-m',
    ].join('\n');
    const r = extractNameHeadlineSummary(header, '');
    expect(r.fullName).toBe('Vadym Melnychenko');
    expect(r.headline).toBe('Senior Frontend Developer');
  });

  it('supports Cyrillic names (UA / RU)', () => {
    const header = 'Вадим Мельниченко\nСтарший Frontend-розробник\nmail@example.com';
    const r = extractNameHeadlineSummary(header, '');
    expect(r.fullName).toBe('Вадим Мельниченко');
    expect(r.headline).toContain('розробник');
  });

  it('supports Italian accented names', () => {
    const header = 'Sofía Martínez\nProduct Designer\nhola@example.com';
    const r = extractNameHeadlineSummary(header, '');
    expect(r.fullName).toBe('Sofía Martínez');
    expect(r.headline).toBe('Product Designer');
  });

  it('skips lines that are contacts (email / url / phone)', () => {
    const header = 'vadym@example.com\n+39 555 123 4567\nVadym Melnychenko\nSenior FE';
    const r = extractNameHeadlineSummary(header, '');
    expect(r.fullName).toBe('Vadym Melnychenko');
    expect(r.headline).toBe('Senior FE');
  });

  it('returns undefined when nothing looks like a name', () => {
    const header = 'vadym@example.com\n+39 555 123 4567\nhttps://example.com';
    const r = extractNameHeadlineSummary(header, '');
    expect(r.fullName).toBeUndefined();
    expect(r.headline).toBeUndefined();
  });

  it('rejects lowercase-only "names"', () => {
    const r = extractNameHeadlineSummary('random words here', '');
    expect(r.fullName).toBeUndefined();
  });

  it('skips digit-containing candidates and picks the next qualifying line', () => {
    const r = extractNameHeadlineSummary('John 2 Doe\nJane Roe\nSoftware Engineer', '');
    expect(r.fullName).toBe('Jane Roe');
    expect(r.headline).toBe('Software Engineer');
  });

  it('truncates long summary with ellipsis', () => {
    const longSummary = 'a'.repeat(1000);
    const r = extractNameHeadlineSummary('Jane Doe', longSummary);
    expect(r.summary?.length).toBeLessThanOrEqual(800);
    expect(r.summary?.endsWith('…')).toBe(true);
  });

  it('returns trimmed summary verbatim when short enough', () => {
    const summary = '   Hands-on frontend engineer with a fintech background.   ';
    const r = extractNameHeadlineSummary('Jane Doe', summary);
    expect(r.summary).toBe('Hands-on frontend engineer with a fintech background.');
  });

  it('headline is not the same line as name', () => {
    const header = 'Jane Doe\nJane Doe\nSoftware Engineer';
    const r = extractNameHeadlineSummary(header, '');
    expect(r.fullName).toBe('Jane Doe');
    expect(r.headline).toBe('Software Engineer');
  });
});

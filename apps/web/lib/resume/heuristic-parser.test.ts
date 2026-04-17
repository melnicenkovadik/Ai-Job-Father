import { ResumeFormatError } from '@ai-job-bot/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const extractText = vi.fn();
vi.mock('unpdf', () => ({
  extractText: (...args: unknown[]) => extractText(...args),
}));

import { HeuristicResumeParser } from './heuristic-parser';

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

function sampleCv(name = 'Vadym'): string {
  return `${name} Melnychenko
Senior Frontend Developer
vadym@example.com
linkedin.com/in/vadym-m

Experience

Acme Corp — Senior Frontend Developer, 2022-01 — present
Delivered React 18 migration.

Education

Kyiv Polytechnic Institute — BSc CS, 2015 — 2019

Skills
React, TypeScript, Next.js, Tailwind

Languages
English C1, Italian B1`;
}

describe('HeuristicResumeParser', () => {
  beforeEach(() => {
    extractText.mockReset();
  });

  it('turns extracted text into a ParsedResume and tags model=heuristic-v1', async () => {
    extractText.mockResolvedValueOnce({ text: sampleCv(), totalPages: 2 });
    const parser = new HeuristicResumeParser();
    const r = await parser.parse({ pdfBytes: PDF_BYTES, userId: 'u-1' });

    expect(r.fullName).toBe('Vadym Melnychenko');
    expect(r.email).toBe('vadym@example.com');
    expect(r.skills.length).toBeGreaterThanOrEqual(3);
    expect(r.experience.length).toBe(1);
    expect(r.languages.length).toBe(2);
    expect(r.model).toBe('heuristic-v1');
  });

  it('throws ResumeFormatError for short text (scanned / image PDF)', async () => {
    extractText.mockResolvedValueOnce({ text: 'only 30 chars of text here ok', totalPages: 1 });
    const parser = new HeuristicResumeParser();
    await expect(parser.parse({ pdfBytes: PDF_BYTES, userId: 'u-1' })).rejects.toBeInstanceOf(
      ResumeFormatError,
    );
  });

  it('wraps unpdf errors as ResumeFormatError', async () => {
    extractText.mockRejectedValueOnce(new Error('pdfjs boom'));
    const parser = new HeuristicResumeParser();
    await expect(parser.parse({ pdfBytes: PDF_BYTES, userId: 'u-1' })).rejects.toBeInstanceOf(
      ResumeFormatError,
    );
  });

  it('forwards user context untouched (userId does not leave the caller)', async () => {
    extractText.mockResolvedValueOnce({ text: sampleCv('Ivan'), totalPages: 1 });
    const parser = new HeuristicResumeParser();
    const r = await parser.parse({
      pdfBytes: PDF_BYTES,
      userId: 'u-42',
      filename: 'cv.pdf',
      languageHint: 'en',
    });
    expect(r.fullName).toBe('Ivan Melnychenko');
  });
});

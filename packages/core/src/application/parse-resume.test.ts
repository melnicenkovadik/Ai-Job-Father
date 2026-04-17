import { describe, expect, it } from 'vitest';
import { FakeResumeParser } from '../../test/fakes/fake-resume-parser';
import { parseResume } from './parse-resume';
import { type ParsedResume, ResumeFormatError, ResumeRateLimitError } from './ports/resume-parser';

function pdfBytes(body: string): Uint8Array {
  const header = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]);
  const tail = new TextEncoder().encode(body);
  const out = new Uint8Array(header.length + tail.length);
  out.set(header, 0);
  out.set(tail, header.length);
  return out;
}

const CANNED: ParsedResume = {
  fullName: 'Vadym Melnychenko',
  headline: 'Senior Frontend Developer',
  yearsTotal: 8,
  englishLevel: 'C1',
  skills: [{ name: 'React', years: 5 }],
  experience: [],
  education: [],
  languages: [{ code: 'en', level: 'C1' }],
  model: 'gpt-5.1',
};

describe('parseResume', () => {
  it('delegates to the parser for a well-formed PDF', async () => {
    const parser = new FakeResumeParser(CANNED);
    const result = await parseResume(
      { parser },
      { pdfBytes: pdfBytes('%fake body'), userId: 'u-1' },
    );
    expect(result.fullName).toBe('Vadym Melnychenko');
    expect(parser.calls).toHaveLength(1);
  });

  it('throws ResumeFormatError on empty bytes', async () => {
    const parser = new FakeResumeParser(CANNED);
    await expect(
      parseResume({ parser }, { pdfBytes: new Uint8Array(0), userId: 'u-1' }),
    ).rejects.toBeInstanceOf(ResumeFormatError);
    expect(parser.calls).toHaveLength(0);
  });

  it('throws ResumeFormatError when file does not start with %PDF-', async () => {
    const parser = new FakeResumeParser(CANNED);
    const notPdf = new TextEncoder().encode('Dear hiring manager, I am ...');
    await expect(
      parseResume({ parser }, { pdfBytes: notPdf, userId: 'u-1' }),
    ).rejects.toBeInstanceOf(ResumeFormatError);
    expect(parser.calls).toHaveLength(0);
  });

  it('throws ResumeFormatError when PDF exceeds 20 MB', async () => {
    const parser = new FakeResumeParser(CANNED);
    const big = new Uint8Array(21 * 1024 * 1024);
    big.set([0x25, 0x50, 0x44, 0x46, 0x2d], 0);
    await expect(parseResume({ parser }, { pdfBytes: big, userId: 'u-1' })).rejects.toBeInstanceOf(
      ResumeFormatError,
    );
    expect(parser.calls).toHaveLength(0);
  });

  it('propagates parser errors unchanged', async () => {
    const parser = new FakeResumeParser(() => {
      throw new ResumeRateLimitError('OpenAI 429');
    });
    await expect(
      parseResume({ parser }, { pdfBytes: pdfBytes('%body'), userId: 'u-1' }),
    ).rejects.toBeInstanceOf(ResumeRateLimitError);
  });

  it('forwards optional filename + languageHint to the parser', async () => {
    const parser = new FakeResumeParser(CANNED);
    await parseResume(
      { parser },
      {
        pdfBytes: pdfBytes('%body'),
        userId: 'u-1',
        filename: 'cv.pdf',
        languageHint: 'uk',
      },
    );
    expect(parser.calls[0]?.filename).toBe('cv.pdf');
    expect(parser.calls[0]?.languageHint).toBe('uk');
  });
});

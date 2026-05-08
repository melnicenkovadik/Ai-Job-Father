/**
 * Test runner for the heuristic resume parser.
 *
 * Walks a directory of PDFs, extracts text via `unpdf`, runs `parseResumeText`
 * from `@ai-job-bot/core`, and writes:
 *   - `_results/summary.csv` — one row per resume with field-fill stats
 *   - `_results/{filename}.json` — full parsed payload (for spot-checking)
 *
 * Usage:
 *   pnpm tsx scripts/test-resume-parser.ts [dir]
 *
 *   default dir: samples/resumes-test/
 *
 * The summary CSV makes it easy to grep for low-fill resumes and see which
 * categories / formats the heuristic stumbles on.
 */

// Promise.try polyfill — unpdf 1.6 uses it; Node 20 doesn't have it (Node 22+ ships it).
// Vercel runs Node 22, so prod is fine. This local script needs the shim.
if (typeof (Promise as unknown as { try?: unknown }).try !== 'function') {
  (Promise as unknown as { try: unknown }).try = <T>(
    fn: (...args: unknown[]) => T | PromiseLike<T>,
    ...args: unknown[]
  ): Promise<T> => new Promise<T>((resolveP) => resolveP(fn(...args)));
}

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { type ParsedResume, parseResumeText } from '@ai-job-bot/core';
import { extractLinks, extractText } from 'unpdf';

const ROOT = resolve(__dirname, '..');
const DEFAULT_DIR = join(ROOT, 'samples/resumes-test');

interface Stat {
  file: string;
  pdf_bytes: number;
  text_chars: number;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  headline_len: number;
  summary_len: number;
  yearsTotal: number | '';
  englishLevel: string;
  skills_count: number;
  experience_count: number;
  education_count: number;
  languages_count: number;
  error: string;
}

function summarize(file: string, pdfBytes: number, text: string, parsed: ParsedResume): Stat {
  return {
    file,
    pdf_bytes: pdfBytes,
    text_chars: text.length,
    fullName: parsed.fullName ?? '',
    email: parsed.email ?? '',
    phone: parsed.phone ?? '',
    location: parsed.location ?? '',
    linkedinUrl: parsed.linkedinUrl ?? '',
    githubUrl: parsed.githubUrl ?? '',
    portfolioUrl: parsed.portfolioUrl ?? '',
    headline_len: parsed.headline?.length ?? 0,
    summary_len: parsed.summary?.length ?? 0,
    yearsTotal: parsed.yearsTotal ?? '',
    englishLevel: parsed.englishLevel ?? '',
    skills_count: parsed.skills.length,
    experience_count: parsed.experience.length,
    education_count: parsed.education.length,
    languages_count: parsed.languages.length,
    error: '',
  };
}

function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsvRow(headers: string[], row: Record<string, unknown>): string {
  return headers.map((h) => csvEscape((row[h] as string | number) ?? '')).join(',');
}

async function processOne(dir: string, file: string): Promise<Stat> {
  const path = join(dir, file);
  const buf = readFileSync(path);
  let parsed: ParsedResume | undefined;
  let text = '';
  try {
    const { text: extracted } = await extractText(new Uint8Array(buf), { mergePages: false });
    const pages = Array.isArray(extracted) ? extracted : [extracted];
    text = pages
      .map((p) => String(p).trim())
      .join('\n\n')
      .trim();
    let links: string[] = [];
    try {
      const linksResult = await extractLinks(new Uint8Array(buf));
      const raw = (linksResult as { links?: unknown }).links ?? (linksResult as unknown);
      if (Array.isArray(raw)) {
        links = raw.filter((u): u is string => typeof u === 'string' && u.length > 0);
      }
    } catch {
      // Best-effort — proceed without link fallback.
    }
    parsed = parseResumeText(text, links);
  } catch (err) {
    return {
      file,
      pdf_bytes: buf.length,
      text_chars: text.length,
      fullName: '',
      email: '',
      phone: '',
      location: '',
      linkedinUrl: '',
      githubUrl: '',
      portfolioUrl: '',
      headline_len: 0,
      summary_len: 0,
      yearsTotal: '',
      englishLevel: '',
      skills_count: 0,
      experience_count: 0,
      education_count: 0,
      languages_count: 0,
      error: (err as Error).message,
    };
  }
  return summarize(file, buf.length, text, parsed);
}

async function main() {
  const dir = process.argv[2] ?? DEFAULT_DIR;
  const outDir = join(dir, '_results');
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .sort();
  if (files.length === 0) {
    console.error(`No PDFs in ${dir}`);
    process.exit(1);
  }
  console.log(`Found ${files.length} PDFs in ${dir}`);

  const stats: Stat[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i] as string;
    const stat = await processOne(dir, file);
    stats.push(stat);

    // Per-file JSON dump (skip on error to keep output clean)
    if (!stat.error) {
      const buf = readFileSync(join(dir, file));
      const { text: raw } = await extractText(new Uint8Array(buf), { mergePages: false });
      const pages = Array.isArray(raw) ? raw : [raw];
      const text = pages
        .map((p) => String(p).trim())
        .join('\n\n')
        .trim();
      let links: string[] = [];
      try {
        const linksResult = await extractLinks(new Uint8Array(buf));
        const rawLinks = (linksResult as { links?: unknown }).links ?? (linksResult as unknown);
        if (Array.isArray(rawLinks)) {
          links = rawLinks.filter((u): u is string => typeof u === 'string' && u.length > 0);
        }
      } catch {
        // ignore
      }
      const parsed = parseResumeText(text, links);
      writeFileSync(
        join(outDir, `${basename(file, '.pdf')}.json`),
        JSON.stringify({ file, text_chars: text.length, parsed }, null, 2),
      );
    }

    if ((i + 1) % 10 === 0 || i === files.length - 1) {
      console.log(`  ${i + 1}/${files.length}`);
    }
  }

  // Write CSV
  const headers: (keyof Stat)[] = [
    'file',
    'pdf_bytes',
    'text_chars',
    'fullName',
    'email',
    'phone',
    'location',
    'linkedinUrl',
    'githubUrl',
    'portfolioUrl',
    'headline_len',
    'summary_len',
    'yearsTotal',
    'englishLevel',
    'skills_count',
    'experience_count',
    'education_count',
    'languages_count',
    'error',
  ];
  const csv = [headers.join(',')]
    .concat(
      stats.map((s) => toCsvRow(headers as string[], s as unknown as Record<string, unknown>)),
    )
    .join('\n');
  writeFileSync(join(outDir, 'summary.csv'), csv);

  // Aggregate stats
  const total = stats.length;
  const errored = stats.filter((s) => s.error).length;
  const filled = (k: keyof Stat) =>
    stats.filter((s) => {
      const v = s[k];
      return typeof v === 'string' ? v.length > 0 : (v as number) > 0;
    }).length;

  console.log('\n=== Summary ===');
  console.log(`Total: ${total} (errors: ${errored})`);
  console.log(`fullName    : ${filled('fullName')}/${total} (${pct(filled('fullName'), total)})`);
  console.log(`email       : ${filled('email')}/${total} (${pct(filled('email'), total)})`);
  console.log(`phone       : ${filled('phone')}/${total} (${pct(filled('phone'), total)})`);
  console.log(`location    : ${filled('location')}/${total} (${pct(filled('location'), total)})`);
  console.log(
    `linkedinUrl : ${filled('linkedinUrl')}/${total} (${pct(filled('linkedinUrl'), total)})`,
  );
  console.log(`githubUrl   : ${filled('githubUrl')}/${total} (${pct(filled('githubUrl'), total)})`);
  console.log(
    `headline    : ${filled('headline_len')}/${total} (${pct(filled('headline_len'), total)})`,
  );
  console.log(
    `summary     : ${filled('summary_len')}/${total} (${pct(filled('summary_len'), total)})`,
  );
  console.log(
    `yearsTotal  : ${filled('yearsTotal')}/${total} (${pct(filled('yearsTotal'), total)})`,
  );
  console.log(
    `skills      : ${filled('skills_count')}/${total} (${pct(filled('skills_count'), total)}) avg=${avg(stats.map((s) => s.skills_count))}`,
  );
  console.log(
    `experience  : ${filled('experience_count')}/${total} (${pct(filled('experience_count'), total)}) avg=${avg(stats.map((s) => s.experience_count))}`,
  );
  console.log(
    `education   : ${filled('education_count')}/${total} (${pct(filled('education_count'), total)}) avg=${avg(stats.map((s) => s.education_count))}`,
  );
  console.log(
    `languages   : ${filled('languages_count')}/${total} (${pct(filled('languages_count'), total)}) avg=${avg(stats.map((s) => s.languages_count))}`,
  );
  console.log(`\nCSV: ${join(outDir, 'summary.csv')}`);
  console.log(`JSON dumps: ${outDir}/`);
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${((n / total) * 100).toFixed(0)}%`;
}

function avg(nums: number[]): string {
  if (nums.length === 0) return '0';
  return (nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

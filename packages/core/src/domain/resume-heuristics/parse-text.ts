/**
 * Orchestrator: plain-text CV → `ParsedResume`.
 *
 * Composes the five extractors against a single pass of the text. The
 * heuristic never returns an error — anything it can't parse becomes
 * `undefined` / empty arrays and the user fills gaps in the review step.
 *
 * Identified by `model: "heuristic-v1"` so downstream consumers can tell
 * "cheap" (free-tier) output from "rich" (AI-tier) output.
 */

import type { ParsedResume } from '../../application/ports/resume-parser';
import type { ExperienceEntry } from '../profile';
import { extractContacts } from './extract-contacts';
import { extractEducation } from './extract-education';
import { extractExperience } from './extract-experience';
import { extractLanguages } from './extract-languages';
import { extractNameHeadlineSummary } from './extract-name';
import { extractSkills } from './extract-skills';
import { findAllSectionBodies, findSectionBody, splitIntoSections } from './section-split';

export const HEURISTIC_MODEL_ID = 'heuristic-v1';

export function parseResumeText(text: string): ParsedResume {
  const normalized = normalize(text);
  const sections = splitIntoSections(normalized);

  const header = findSectionBody(sections, 'header');
  const summaryBody = findSectionBody(sections, 'summary');
  const contacts = extractContacts(normalized);
  // If the section-splitter ate the header (e.g. line 0 is a category label
  // that matches a section heading), fall back to the first 10 lines of the
  // text so name+headline can still be extracted.
  const nameHeaderInput = header.length > 30 ? header : firstNonEmptyLines(normalized, 10);
  const { fullName, headline, summary } = extractNameHeadlineSummary(nameHeaderInput, summaryBody);

  const skills = extractSkills(findAllSectionBodies(sections, 'skills'));
  const languages = extractLanguages(findAllSectionBodies(sections, 'languages'));
  const experience = extractExperience(findAllSectionBodies(sections, 'experience'));
  const education = extractEducation(findAllSectionBodies(sections, 'education'));
  const yearsTotal = computeYearsTotal(experience);
  const englishLevel = languages.find((l) => l.code === 'en')?.level;

  return {
    fullName,
    email: contacts.email,
    phone: contacts.phone,
    linkedinUrl: contacts.linkedinUrl,
    githubUrl: contacts.githubUrl,
    portfolioUrl: contacts.portfolioUrl,
    location: contacts.location,
    headline,
    summary,
    yearsTotal,
    englishLevel,
    skills,
    experience,
    education,
    languages,
    model: HEURISTIC_MODEL_ID,
  };
}

function computeYearsTotal(experience: readonly ExperienceEntry[]): number | undefined {
  if (experience.length === 0) return undefined;
  const now = new Date();
  let totalMonths = 0;
  for (const exp of experience) {
    const start = parseMonth(exp.startMonth);
    const end = exp.endMonth ? parseMonth(exp.endMonth) : now;
    if (!start || !end) continue;
    const diff =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (diff > 0) totalMonths += diff;
  }
  if (totalMonths < 12) return undefined;
  return Math.min(80, Math.floor(totalMonths / 12));
}

function parseMonth(ym: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m?.[1] || !m[2]) return null;
  const year = Number.parseInt(m[1], 10);
  const month = Number.parseInt(m[2], 10);
  if (month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, 1));
}

function normalize(text: string): string {
  return text
    // Postgres `text` columns reject U+0000; some PDF extractors emit them.
    // Strip nulls and other C0 control bytes (except \t, \n, \r) before any
    // downstream consumer can copy them into a Profile field.
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\u00A0]+/g, ' ')
    .trim();
}

/** First N non-empty lines. Used as fallback header when section-split ate it. */
function firstNonEmptyLines(text: string, n: number): string {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    out.push(trimmed);
    if (out.length >= n) break;
  }
  return out.join('\n');
}

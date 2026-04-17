import { describe, expect, it } from 'vitest';
import { HEURISTIC_MODEL_ID, parseResumeText } from './parse-text';

const EN_CV = `Vadym Melnychenko
Senior Frontend Developer
vadym@example.com · +39 555 123 4567
https://linkedin.com/in/vadym-m
github.com/melnicenkovadik

Summary
Hands-on React engineer with fintech background.

Experience

Acme Corp — Senior Frontend Developer, 2022-01 — present
Delivered React 18 migration and design-system rollout.

Startup Inc — Frontend Developer, 2019-06 — 2021-12
Migrated Vue 2 codebase to React.

Education

Kyiv Polytechnic Institute — BSc Computer Science, 2015 — 2019

Skills
React (5 years), TypeScript (4), Next.js (3), Tailwind

Languages
English C1, Italian B1, Ukrainian native`;

const UA_CV = `Вадим Мельниченко
Senior Frontend Developer
vadym@example.com

Досвід роботи

Acme — Senior Developer, 2022-01 — нині
React 18 migration.

Освіта

КПІ — BSc CS, 2015 — 2019

Навички
React, TypeScript, Next.js

Мови
українська рідна, англійська C1`;

const IT_CV = `Sofía Martínez
Product Designer
hola@example.com

Esperienza

Acme — Senior Designer, 2022-01 — present
Design system rollout.

Istruzione

Politecnico di Milano — MSc Design, 2018 — 2020

Competenze
Figma, Sketch, Adobe XD

Lingue
Italiano madrelingua, Inglese C1, Spagnolo B2`;

describe('parseResumeText — English CV', () => {
  const r = parseResumeText(EN_CV);

  it('pulls identity fields', () => {
    expect(r.fullName).toBe('Vadym Melnychenko');
    expect(r.headline).toBe('Senior Frontend Developer');
    expect(r.email).toBe('vadym@example.com');
    expect(r.linkedinUrl).toBe('https://linkedin.com/in/vadym-m');
    expect(r.githubUrl).toBe('https://github.com/melnicenkovadik');
    expect(r.phone).toContain('555');
  });

  it('extracts summary / skills / languages / education', () => {
    expect(r.summary).toContain('React');
    expect(r.skills.length).toBeGreaterThanOrEqual(4);
    expect(r.skills.find((s) => s.name === 'React')?.years).toBe(5);
    expect(r.languages.find((l) => l.code === 'en')?.level).toBe('C1');
    expect(r.languages.find((l) => l.code === 'uk')?.level).toBe('C2');
    expect(r.englishLevel).toBe('C1');
    expect(r.education.length).toBe(1);
  });

  it('parses both experience entries', () => {
    expect(r.experience.length).toBe(2);
    expect(r.experience[0]?.company).toBe('Acme Corp');
    expect(r.experience[0]?.endMonth).toBeNull();
    expect(r.experience[1]?.company).toBe('Startup Inc');
    expect(r.experience[1]?.endMonth).toBe('2021-12');
  });

  it('computes yearsTotal as sum of non-overlapping spans', () => {
    expect(r.yearsTotal).toBeGreaterThanOrEqual(4);
    expect(r.yearsTotal).toBeLessThanOrEqual(15);
  });

  it('tags the output with the heuristic model id', () => {
    expect(r.model).toBe(HEURISTIC_MODEL_ID);
  });
});

describe('parseResumeText — Ukrainian CV', () => {
  const r = parseResumeText(UA_CV);

  it('extracts Cyrillic name + section content', () => {
    expect(r.fullName).toBe('Вадим Мельниченко');
    expect(r.email).toBe('vadym@example.com');
    expect(r.skills.length).toBeGreaterThanOrEqual(3);
    expect(r.experience[0]?.company).toBe('Acme');
    expect(r.experience[0]?.endMonth).toBeNull();
    expect(r.languages.find((l) => l.code === 'uk')?.level).toBe('C2');
    expect(r.languages.find((l) => l.code === 'en')?.level).toBe('C1');
  });
});

describe('parseResumeText — Italian CV', () => {
  const r = parseResumeText(IT_CV);

  it('parses accented name + Italian section headings', () => {
    expect(r.fullName).toBe('Sofía Martínez');
    expect(r.headline).toBe('Product Designer');
    expect(r.skills.find((s) => s.name === 'Figma')).toBeDefined();
    expect(r.languages.find((l) => l.code === 'it')?.level).toBe('C2');
    expect(r.languages.find((l) => l.code === 'en')?.level).toBe('C1');
    expect(r.languages.find((l) => l.code === 'es')?.level).toBe('B2');
  });
});

describe('parseResumeText — empty input', () => {
  it('returns empty arrays and undefined fields', () => {
    const r = parseResumeText('');
    expect(r.fullName).toBeUndefined();
    expect(r.skills).toEqual([]);
    expect(r.experience).toEqual([]);
    expect(r.languages).toEqual([]);
    expect(r.yearsTotal).toBeUndefined();
  });
});

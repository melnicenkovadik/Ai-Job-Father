/**
 * Regression tests against real-world CV layouts that the heuristic parser
 * was failing on in production. Each fixture is a condensed copy of a real
 * PDF's extracted text; we assert the parser pulls the core fields.
 */

import { describe, expect, it } from 'vitest';
import { parseResumeText } from './parse-text';

const REAL_CV_EN = `Vadym Melnychenko
Senior Frontend Developer
LinkedIn | GitHub | Telegram | Phone: +39 388 860 5311 | Email: melnicenkovadik@gmail.com

Professional Summary

Senior Frontend Developer with 9+ years of experience in fintech, blockchain, AI, and SaaS. Expert in React and Next.js with deep expertise in building AI-powered platforms (Harvey), secure crypto wallets, and complex fintech applications.

Professional Experience

Trustify | Senior Software Engineer, Frontend
May 2025 – Present
Architected and developed the core customer-facing web application end-to-end.

Harvey | Software Engineer (contract)
Aug 2024 – Apr 2025
Built and refined UI for AI-powered legal tools.

Coinbase | Senior React Developer (contract)
Mar 2022 – Jan 2023
Collaborated with cross-functional teams to integrate advanced analytics.

Education

Master's degree in Computer System Analyst, National University of Life and Environmental Sciences of Ukraine, 2012 - 2018

Technical Skills

Frontend: React, Next.js, Redux Toolkit, MobX, TypeScript, Webpack, GraphQL
AI & LLM Integration: OpenAI API, Claude API, LangChain, RAG pipelines
Blockchain: Ethers.js, Web3.js, Hardhat, WAGMI
Styling: CSS3, SCSS, Tailwind, styled-components

Languages

Ukrainian: Native
Russian: Fluent
English: Upper Intermediate (B2)
Italian: Conversational (B1)`;

describe('parseResumeText — real CV (Vadym Melnychenko)', () => {
  const r = parseResumeText(REAL_CV_EN);

  it('extracts identity fields from the header block', () => {
    expect(r.fullName).toBe('Vadym Melnychenko');
    expect(r.headline).toBe('Senior Frontend Developer');
    expect(r.email).toBe('melnicenkovadik@gmail.com');
    expect(r.phone).toContain('388');
    expect(r.phone).toContain('5311');
  });

  it('recognises "Professional Summary" as a summary section', () => {
    expect(r.summary).toBeDefined();
    expect(r.summary).toContain('9+ years');
    expect(r.summary).toContain('fintech');
  });

  it('splits "Company | Role" experience headers', () => {
    expect(r.experience.length).toBeGreaterThanOrEqual(3);
    const trustify = r.experience.find((e) => e.company === 'Trustify');
    expect(trustify).toBeDefined();
    expect(trustify?.role).toContain('Senior Software Engineer');
    expect(trustify?.endMonth).toBeNull();

    const coinbase = r.experience.find((e) => e.company === 'Coinbase');
    expect(coinbase).toBeDefined();
    expect(coinbase?.role).toContain('Senior React Developer');
  });

  it('handles dates on a separate line from the header', () => {
    const harvey = r.experience.find((e) => e.company === 'Harvey');
    expect(harvey).toBeDefined();
    expect(harvey?.startMonth).toBe('2024-08');
    expect(harvey?.endMonth).toBe('2025-04');
  });

  it('extracts education entries with free-form school + degree', () => {
    expect(r.education.length).toBeGreaterThanOrEqual(1);
    const edu = r.education[0];
    expect(edu?.school).toContain('National University');
    expect(edu?.startMonth).toBe('2012-01');
    expect(edu?.endMonth).toBe('2018-01');
  });

  it('pulls skills from category-prefixed lines ("Frontend: …")', () => {
    const names = r.skills.map((s) => s.name.toLowerCase());
    expect(names).toContain('react');
    expect(names).toContain('typescript');
    expect(names).toContain('graphql');
    // Category label itself must not appear as a skill
    expect(names).not.toContain('frontend:');
  });

  it('parses all 4 languages with correct CEFR levels', () => {
    const byCode = new Map(r.languages.map((l) => [l.code, l.level]));
    expect(byCode.get('uk')).toBe('C2');
    expect(byCode.get('ru')).toBe('C1');
    expect(byCode.get('en')).toBe('B2');
    expect(byCode.get('it')).toBe('B1');
  });

  it('computes yearsTotal from the experience spans', () => {
    expect(r.yearsTotal).toBeGreaterThanOrEqual(1);
    expect(r.yearsTotal).toBeLessThanOrEqual(20);
  });
});

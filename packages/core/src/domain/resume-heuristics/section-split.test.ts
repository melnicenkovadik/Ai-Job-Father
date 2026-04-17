import { describe, expect, it } from 'vitest';
import { findSectionBody, splitIntoSections } from './section-split';

describe('splitIntoSections', () => {
  it('routes English headings to canonical keys', () => {
    const text = [
      'Vadym Melnychenko',
      'Senior Frontend Developer',
      '',
      'Summary',
      'Experienced React engineer.',
      '',
      'Experience',
      'Acme Corp — Senior FE (2022 — present)',
      '',
      'Education',
      'KPI — BSc CS (2019)',
      '',
      'Skills',
      'React, TypeScript, Next.js',
      '',
      'Languages',
      'English C1, Italian B1',
    ].join('\n');

    const sections = splitIntoSections(text);
    const keys = sections.map((s) => s.key);
    expect(keys).toEqual(['header', 'summary', 'experience', 'education', 'skills', 'languages']);
    expect(findSectionBody(sections, 'skills')).toContain('React');
    expect(findSectionBody(sections, 'languages')).toContain('Italian B1');
    expect(findSectionBody(sections, 'experience')).toContain('Acme Corp');
  });

  it('keeps pre-heading content in the synthetic "header" section', () => {
    const text = 'Vadym Melnychenko\nvadym@example.com\n+39 555 0000\n\nExperience\nAcme';
    const sections = splitIntoSections(text);
    expect(sections[0]?.key).toBe('header');
    expect(sections[0]?.body).toContain('vadym@example.com');
    expect(sections[1]?.key).toBe('experience');
  });

  it('handles Ukrainian headings', () => {
    const text = 'Ім’я\n\nДосвід роботи\nAcme\n\nОсвіта\nКПІ\n\nМови\nАнгл. B2';
    const sections = splitIntoSections(text);
    const keys = sections.map((s) => s.key);
    expect(keys).toEqual(['header', 'experience', 'education', 'languages']);
  });

  it('handles Russian headings', () => {
    const text = 'Имя\n\nОпыт работы\nAcme\n\nОбразование\nМГУ\n\nЯзыки\nEN B2';
    const sections = splitIntoSections(text);
    expect(sections.map((s) => s.key)).toEqual(['header', 'experience', 'education', 'languages']);
  });

  it('handles Italian headings', () => {
    const text = 'Nome\n\nEsperienza\nAcme\n\nIstruzione\nRoma Tre\n\nLingue\nIT C2, EN B2';
    const sections = splitIntoSections(text);
    expect(sections.map((s) => s.key)).toEqual(['header', 'experience', 'education', 'languages']);
  });

  it('handles Polish headings', () => {
    const text =
      'Imię\n\nDoświadczenie zawodowe\nAcme\n\nWykształcenie\nPW\n\nJęzyki\nPL native, EN B2';
    const sections = splitIntoSections(text);
    expect(sections.map((s) => s.key)).toEqual(['header', 'experience', 'education', 'languages']);
  });

  it('tolerates trailing colon / dash on headings', () => {
    const text = 'Ivan\n\nSkills:\nReact\n\nExperience -\nAcme';
    const sections = splitIntoSections(text);
    const keys = sections.map((s) => s.key);
    expect(keys).toEqual(['header', 'skills', 'experience']);
  });

  it('does not treat sentence-like lines as headings', () => {
    const text =
      'Ivan\n\nI love building scalable skills platforms.\nResponsible for skills development.';
    const sections = splitIntoSections(text);
    // Neither "Skills" sentence should promote a section.
    expect(sections.every((s) => s.key !== 'skills')).toBe(true);
  });

  it('does not promote very long lines even if they contain a heading word', () => {
    const long =
      'This is a very long sentence that happens to contain the word experience somewhere in the middle of it';
    const text = `Ivan\n\n${long}\nbody`;
    const sections = splitIntoSections(text);
    expect(sections.every((s) => s.key !== 'experience')).toBe(true);
  });

  it('findSectionBody returns empty string when section is missing', () => {
    const sections = splitIntoSections('Ivan\n\nExperience\nAcme');
    expect(findSectionBody(sections, 'skills')).toBe('');
  });
});

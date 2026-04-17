/**
 * Resume heuristics — framework-free, no-AI text-to-ParsedResume pipeline.
 * Ships as the free-tier parser. AI-tier (gpt-5.1) is an alternative
 * `ResumeParser` adapter (ADR 0006) paid for with Telegram Stars.
 */

export * from './parse-text';
export type { Section, SectionKey } from './section-split';
export { splitIntoSections, findSectionBody } from './section-split';
export { extractContacts, type ContactInfo } from './extract-contacts';
export { extractNameHeadlineSummary, type NameHeadlineSummary } from './extract-name';
export { extractSkills } from './extract-skills';
export { extractLanguages, type LanguageEntryOut } from './extract-languages';
export { extractExperience } from './extract-experience';
export { extractEducation } from './extract-education';

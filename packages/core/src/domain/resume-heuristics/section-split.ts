/**
 * Split a plain-text CV into labelled sections using a multilingual heading
 * dictionary. Free-tier / no-AI parser relies on this to route text to the
 * right extractor (skills vs experience vs education, etc.).
 *
 * Heading detection is intentionally lenient:
 *   - line is short (<= 60 chars after trimming);
 *   - contains no sentence-ending punctuation;
 *   - the lowercased / trailing-colon-stripped form is present in the
 *     heading dictionary (en/uk/ru/it/pl).
 *
 * Everything *before* the first heading lands in a synthetic "header" section
 * — that's where name + contacts + headline typically live in a CV and where
 * the other extractors start.
 */

export type SectionKey =
  | 'header'
  | 'summary'
  | 'skills'
  | 'experience'
  | 'education'
  | 'languages'
  | 'other';

export interface Section {
  readonly key: SectionKey;
  readonly heading: string;
  readonly body: string;
}

/**
 * Lowercase / colon-stripped heading variants keyed to a canonical section.
 * Ordered by section for readability — order does not affect matching.
 */
const HEADING_MAP: ReadonlyMap<string, SectionKey> = new Map([
  // ---- summary ----
  ['summary', 'summary'],
  ['professional summary', 'summary'],
  ['personal summary', 'summary'],
  ['profile', 'summary'],
  ['professional profile', 'summary'],
  ['personal profile', 'summary'],
  ['personal statement', 'summary'],
  ['career summary', 'summary'],
  ['about', 'summary'],
  ['about me', 'summary'],
  ['objective', 'summary'],
  ['career objective', 'summary'],
  ['career goal', 'summary'],
  ['career goals', 'summary'],
  ['bio', 'summary'],
  ['biography', 'summary'],
  ['про себе', 'summary'],
  ['профіль', 'summary'],
  ['короткий опис', 'summary'],
  ['о себе', 'summary'],
  ['профиль', 'summary'],
  ['краткое описание', 'summary'],
  ['profilo', 'summary'],
  ['su di me', 'summary'],
  ['profil', 'summary'],
  ['o mnie', 'summary'],
  // ---- skills ----
  ['skills', 'skills'],
  ['technical skills', 'skills'],
  ['tech stack', 'skills'],
  ['key skills', 'skills'],
  ['core skills', 'skills'],
  ['core competencies', 'skills'],
  ['competencies', 'skills'],
  ['areas of expertise', 'skills'],
  ['areas of strength', 'skills'],
  ['professional skills', 'skills'],
  ['expertise', 'skills'],
  ['highlights', 'skills'],
  ['qualifications', 'skills'],
  ['key qualifications', 'skills'],
  ['additional skills', 'skills'],
  ['proficiencies', 'skills'],
  ['strengths', 'skills'],
  ['skill highlights', 'skills'],
  ['professional forte', 'skills'],
  ['professional skills & abilities', 'skills'],
  ['key strengths', 'skills'],
  ['core qualifications', 'skills'],
  ['knowledge', 'skills'],
  ['навички', 'skills'],
  ['ключові навички', 'skills'],
  ['технології', 'skills'],
  ['навыки', 'skills'],
  ['ключевые навыки', 'skills'],
  ['стек', 'skills'],
  ['технологии', 'skills'],
  ['competenze', 'skills'],
  ['competenze tecniche', 'skills'],
  ['umiejętności', 'skills'],
  ['umiejętności techniczne', 'skills'],
  // ---- experience ----
  ['experience', 'experience'],
  ['work experience', 'experience'],
  ['employment', 'experience'],
  ['employment history', 'experience'],
  ['professional experience', 'experience'],
  ['work history', 'experience'],
  ['career history', 'experience'],
  ['career experience', 'experience'],
  ['career', 'experience'],
  ['previous experience', 'experience'],
  ['relevant experience', 'experience'],
  ['professional background', 'experience'],
  ['internship', 'experience'],
  ['internships', 'experience'],
  ['internship experience', 'experience'],
  ['curatorial experience', 'experience'],
  ['volunteer experience', 'experience'],
  ['volunteering', 'experience'],
  ['projects', 'experience'],
  ['professional projects', 'experience'],
  ['key projects', 'experience'],
  ['досвід', 'experience'],
  ['досвід роботи', 'experience'],
  ['професійний досвід', 'experience'],
  ['опыт', 'experience'],
  ['опыт работы', 'experience'],
  ['профессиональный опыт', 'experience'],
  ['esperienza', 'experience'],
  ['esperienze', 'experience'],
  ['esperienza lavorativa', 'experience'],
  ['doświadczenie', 'experience'],
  ['doświadczenie zawodowe', 'experience'],
  // ---- education ----
  ['education', 'education'],
  ['educations', 'education'],
  ['academic background', 'education'],
  ['academic history', 'education'],
  ['academics', 'education'],
  ['academic qualifications', 'education'],
  ['educational background', 'education'],
  ['educational qualifications', 'education'],
  ['education and training', 'education'],
  ['education & training', 'education'],
  ['training', 'education'],
  ['training and education', 'education'],
  ['qualifications and training', 'education'],
  ['education and certifications', 'education'],
  ['certifications and education', 'education'],
  ['licenses and certifications', 'education'],
  ['licenses & certifications', 'education'],
  ['certifications', 'education'],
  ['certificates', 'education'],
  ['licensure', 'education'],
  ['освіта', 'education'],
  ['навчання', 'education'],
  ['образование', 'education'],
  ['istruzione', 'education'],
  ['formazione', 'education'],
  ['edukacja', 'education'],
  ['wykształcenie', 'education'],
  // ---- languages ----
  ['languages', 'languages'],
  ['spoken languages', 'languages'],
  ['мови', 'languages'],
  ['знання мов', 'languages'],
  ['языки', 'languages'],
  ['владение языками', 'languages'],
  ['lingue', 'languages'],
  ['lingue parlate', 'languages'],
  ['języki', 'languages'],
  ['znajomość języków', 'languages'],
]);

const MAX_HEADING_LENGTH = 60;

export function splitIntoSections(text: string): readonly Section[] {
  const lines = text.split('\n');
  const sections: Section[] = [{ key: 'header', heading: '', body: '' }];

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    const match = matchHeading(line);
    if (match) {
      sections.push({ key: match.key, heading: line, body: '' });
      continue;
    }
    const current = sections[sections.length - 1];
    if (!current) continue;
    sections[sections.length - 1] = {
      ...current,
      body: current.body.length === 0 ? line : `${current.body}\n${line}`,
    };
  }

  return sections.map((s) => ({ ...s, body: s.body.trim() }));
}

interface HeadingMatch {
  readonly key: SectionKey;
}

function matchHeading(line: string): HeadingMatch | null {
  if (line.length === 0 || line.length > MAX_HEADING_LENGTH) return null;
  // Reject lines that look like sentences — periods mid-line, multiple commas.
  if (/[.;!?]\s|,.*,/.test(line)) return null;
  const normalized = line
    .toLowerCase()
    // Strip leading bullets / decorative chars: `• employment history`, `▪ skills`,
    // `> experience` — common in PDFs that bullet-format their section headers.
    .replace(/^[\s•·*‣◦▪►▶➤>\-–—_]+/, '')
    .replace(/[:\-–—]+$/, '')
    .trim();
  if (!normalized) return null;
  const direct = HEADING_MAP.get(normalized);
  if (direct) return { key: direct };
  return null;
}

/**
 * Return the first section body for a given key, or empty string.
 * Useful when only the topmost block matters (summary, header).
 */
export function findSectionBody(sections: readonly Section[], key: SectionKey): string {
  for (const s of sections) {
    if (s.key === key && s.body.length > 0) return s.body;
  }
  return '';
}

/**
 * Merge ALL section bodies for a given key. Useful for skills (CVs often have
 * multiple skill-like sections: HIGHLIGHTS + SKILLS + CORE COMPETENCIES) and
 * for experience (some templates split into multiple "Experience" / "Work
 * History" / "Career" blocks).
 */
export function findAllSectionBodies(sections: readonly Section[], key: SectionKey): string {
  const bodies: string[] = [];
  for (const s of sections) {
    if (s.key === key && s.body.length > 0) bodies.push(s.body);
  }
  return bodies.join('\n\n');
}

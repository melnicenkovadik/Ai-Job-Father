import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

type Locale = 'en' | 'uk' | 'ru' | 'it' | 'pl';
const LOCALES: Locale[] = ['en', 'uk', 'ru', 'it', 'pl'];

function readMessages(locale: Locale): Record<string, unknown> {
  const path = join(__dirname, `${locale}.json`);
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

function keyPaths(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return [prefix];
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    out.push(...keyPaths(v, next));
  }
  return out.sort();
}

describe('messages parity across locales', () => {
  it('ships all five MVP locales', () => {
    const files = readdirSync(__dirname).filter((f) => f.endsWith('.json'));
    for (const l of LOCALES) {
      expect(files).toContain(`${l}.json`);
    }
  });

  it('every locale has the same key set as en.json', () => {
    const enKeys = keyPaths(readMessages('en'));
    for (const l of LOCALES.filter((x) => x !== 'en')) {
      const keys = keyPaths(readMessages(l));
      expect(keys, `locale=${l}`).toEqual(enKeys);
    }
  });
});

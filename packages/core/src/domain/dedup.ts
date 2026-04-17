/**
 * Snapshot canonicalisation + hashing + similarity.
 *
 * Three jobs:
 *   1. `canonicalJSON(value)` — deterministic serialisation (keys sorted, arrays preserved,
 *      undefined stripped). Two logically-equal snapshots always stringify to the same bytes.
 *   2. `snapshotHash(value)` — SHA-256 hex of the canonical JSON. Stored on
 *      `campaigns.snapshot_hash` so the wizard can detect near-duplicate paid campaigns
 *      without scanning all rows.
 *   3. `similarity(a, b)` — Jaccard over the multiset of `(path, stringified-value)` pairs.
 *      Returns `1.0` for identical shapes and `0.0` for disjoint. Used on Review screen
 *      to flag "this looks like your paid campaign from YYYY-MM-DD, continue?".
 *
 * Framework-free. Uses `node:crypto`'s `createHash` (Node runtime only). Browser callers
 * should compute the hash server-side and read it back — we never expose raw snapshot bytes
 * to the client post-payment anyway.
 */

import { createHash } from 'node:crypto';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function isPlainObject(value: unknown): value is Record<string, JsonValue> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Deterministic JSON — keys sorted recursively, undefined / functions / symbols stripped,
 * array order preserved, NaN / Infinity rejected.
 */
export function canonicalJSON(value: JsonValue): string {
  return JSON.stringify(canonicalise(value));
}

function canonicalise(value: JsonValue): JsonValue {
  if (value === null) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`canonicalJSON: non-finite number (${value})`);
    }
    return value;
  }
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.map((v) => canonicalise(v));
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const out: Record<string, JsonValue> = {};
    for (const [k, v] of entries) {
      out[k] = canonicalise(v);
    }
    return out;
  }
  throw new Error(`canonicalJSON: unsupported value type (${typeof value})`);
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function snapshotHash(value: JsonValue): string {
  return sha256Hex(canonicalJSON(value));
}

/**
 * Flatten a JSON value into `(path, scalarString)` pairs for Jaccard.
 * Arrays index-paths become `a.0`, `a.1`; objects become `o.key`.
 */
function flatten(value: JsonValue, prefix = ''): string[] {
  if (value === null) return [`${prefix}=null`];
  if (typeof value === 'string') return [`${prefix}="${value}"`];
  if (typeof value === 'number') return [`${prefix}=${value}`];
  if (typeof value === 'boolean') return [`${prefix}=${value}`];
  if (Array.isArray(value)) {
    if (value.length === 0) return [`${prefix}=[]`];
    const out: string[] = [];
    for (let i = 0; i < value.length; i++) {
      out.push(...flatten(value[i] as JsonValue, `${prefix}.${i}`));
    }
    return out;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    if (keys.length === 0) return [`${prefix}={}`];
    const out: string[] = [];
    for (const k of keys) {
      out.push(...flatten(value[k] as JsonValue, prefix ? `${prefix}.${k}` : k));
    }
    return out;
  }
  return [];
}

/**
 * Jaccard similarity: |A ∩ B| / |A ∪ B| over flattened path=value pairs.
 *   - Identical inputs ⇒ 1.0
 *   - Disjoint inputs ⇒ 0.0
 *   - Symmetric.
 */
export function similarity(a: JsonValue, b: JsonValue): number {
  const setA = new Set(flatten(a));
  const setB = new Set(flatten(b));
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const x of setA) if (setB.has(x)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

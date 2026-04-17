/**
 * Snapshot barrel — schema + canonicalisation + hashing live here so
 * `import { snapshotV1Schema, canonicalJSON } from '@ai-job-bot/core'` works
 * for both the wizard and the downstream worker.
 */

export * from './schema';

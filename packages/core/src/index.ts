export const CORE_VERSION = '0.0.1';

export * from './domain/locale';
export * from './domain/user';
export * from './domain/user-settings';
export * from './domain/profile';
export * from './domain/job-category';
export * from './domain/pricing';
export * from './domain/volume-estimate';
// `./domain/dedup` is server-only (uses node:crypto). Import directly as
// `@ai-job-bot/core/domain/dedup` from Node runtimes — never from the client
// bundle.
export * from './domain/category-fields';
export * from './domain/snapshot';
export * from './domain/resume-heuristics';
export * from './application/ports/clock';
export * from './application/ports/user-repo';
export * from './application/ports/user-settings-repo';
export * from './application/ports/profile-repo';
export * from './application/ports/resume-parser';
export * from './application/upsert-user';
export * from './application/update-user-settings';
export * from './application/mark-onboarded';
export * from './application/save-profile';
export * from './application/parse-resume';

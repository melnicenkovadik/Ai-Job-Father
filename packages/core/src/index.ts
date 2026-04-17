export const CORE_VERSION = '0.0.1';

export * from './domain/locale';
export * from './domain/user';
export * from './domain/profile';
export * from './domain/job-category';
export * from './domain/pricing';
export * from './domain/volume-estimate';
export * from './domain/dedup';
export * from './domain/category-fields';
export * from './domain/snapshot';
export * from './domain/resume-heuristics';
export * from './application/ports/clock';
export * from './application/ports/user-repo';
export * from './application/ports/profile-repo';
export * from './application/ports/resume-parser';
export * from './application/upsert-user';
export * from './application/save-profile';
export * from './application/parse-resume';

/**
 * Profile aggregate — resume-derived user identity.
 *
 * Framework-free: no Supabase, no Anthropic, no Next. Consumers (adapters)
 * hydrate `Profile` via `Profile.rehydrate(...)` after loading rows or applying
 * AI parse output.
 *
 * Multi-per-user: a single user may have several named profiles (partial-unique
 * index on (user_id) WHERE is_default=true enforces exactly one default).
 *
 * Category-specific fields live in `category_fields` as a discriminated union
 * keyed on `preferred_categories[0]` (or inferred at campaign time).
 *
 * At checkout-time (Phase 4) a full copy of the profile is frozen into
 * `campaigns.snapshot_profile` so downstream workers don't see drift after
 * the user edits the source profile.
 */

import { type JobCategory, isJobCategory } from './job-category';
import { DomainError } from './user';

export class InvalidProfileError extends DomainError {}

export class ProfileId {
  private constructor(public readonly value: string) {}

  static from(value: string): ProfileId {
    if (typeof value !== 'string' || value.length === 0) {
      throw new InvalidProfileError(`Invalid ProfileId: ${String(value)}`);
    }
    return new ProfileId(value);
  }

  equals(other: ProfileId): boolean {
    return this.value === other.value;
  }
}

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export function isCefrLevel(value: unknown): value is CefrLevel {
  return typeof value === 'string' && (CEFR_LEVELS as readonly string[]).includes(value);
}

export interface Skill {
  readonly name: string;
  readonly years?: number | undefined;
  readonly level?: CefrLevel | undefined;
}

export interface ExperienceEntry {
  readonly company: string;
  readonly role: string;
  /** ISO YYYY-MM. `null` ⇒ still working there (on `endMonth`). */
  readonly startMonth: string;
  readonly endMonth: string | null;
  readonly description?: string | undefined;
  readonly stack?: readonly string[] | undefined;
}

export interface EducationEntry {
  readonly school: string;
  readonly degree?: string | undefined;
  readonly startMonth?: string | undefined;
  readonly endMonth?: string | undefined;
}

export interface LanguageEntry {
  readonly code: string; // ISO-639-1
  readonly level: CefrLevel;
}

export interface ProfileState {
  readonly id: ProfileId;
  readonly userId: string;
  readonly name: string;
  readonly isDefault: boolean;
  readonly preferredCategories: readonly JobCategory[];
  readonly fullName?: string | undefined;
  readonly email?: string | undefined;
  readonly phone?: string | undefined;
  readonly location?: string | undefined;
  readonly timezone?: string | undefined;
  readonly linkedinUrl?: string | undefined;
  readonly githubUrl?: string | undefined;
  readonly telegramUrl?: string | undefined;
  readonly twitterUrl?: string | undefined;
  readonly portfolioUrl?: string | undefined;
  readonly headline?: string | undefined;
  readonly summary?: string | undefined;
  readonly yearsTotal?: number | undefined;
  readonly englishLevel?: CefrLevel | undefined;
  readonly skills: readonly Skill[];
  readonly experience: readonly ExperienceEntry[];
  readonly education: readonly EducationEntry[];
  readonly languages: readonly LanguageEntry[];
  /** Discriminated-union shape — validated by `category-fields/*` Zod schemas. */
  readonly categoryFields: Readonly<Record<string, unknown>>;
  readonly resumeStoragePath?: string | undefined;
  readonly resumeParsedAt?: Date | undefined;
  readonly resumeParseModel?: string | undefined;
  readonly resumeFileHash?: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class Profile implements ProfileState {
  readonly id: ProfileId;
  readonly userId: string;
  readonly name: string;
  readonly isDefault: boolean;
  readonly preferredCategories: readonly JobCategory[];
  readonly fullName?: string | undefined;
  readonly email?: string | undefined;
  readonly phone?: string | undefined;
  readonly location?: string | undefined;
  readonly timezone?: string | undefined;
  readonly linkedinUrl?: string | undefined;
  readonly githubUrl?: string | undefined;
  readonly telegramUrl?: string | undefined;
  readonly twitterUrl?: string | undefined;
  readonly portfolioUrl?: string | undefined;
  readonly headline?: string | undefined;
  readonly summary?: string | undefined;
  readonly yearsTotal?: number | undefined;
  readonly englishLevel?: CefrLevel | undefined;
  readonly skills: readonly Skill[];
  readonly experience: readonly ExperienceEntry[];
  readonly education: readonly EducationEntry[];
  readonly languages: readonly LanguageEntry[];
  readonly categoryFields: Readonly<Record<string, unknown>>;
  readonly resumeStoragePath?: string | undefined;
  readonly resumeParsedAt?: Date | undefined;
  readonly resumeParseModel?: string | undefined;
  readonly resumeFileHash?: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(state: ProfileState) {
    this.id = state.id;
    this.userId = state.userId;
    this.name = state.name;
    this.isDefault = state.isDefault;
    this.preferredCategories = state.preferredCategories;
    this.fullName = state.fullName;
    this.email = state.email;
    this.phone = state.phone;
    this.location = state.location;
    this.timezone = state.timezone;
    this.linkedinUrl = state.linkedinUrl;
    this.githubUrl = state.githubUrl;
    this.telegramUrl = state.telegramUrl;
    this.twitterUrl = state.twitterUrl;
    this.portfolioUrl = state.portfolioUrl;
    this.headline = state.headline;
    this.summary = state.summary;
    this.yearsTotal = state.yearsTotal;
    this.englishLevel = state.englishLevel;
    this.skills = state.skills;
    this.experience = state.experience;
    this.education = state.education;
    this.languages = state.languages;
    this.categoryFields = state.categoryFields;
    this.resumeStoragePath = state.resumeStoragePath;
    this.resumeParsedAt = state.resumeParsedAt;
    this.resumeParseModel = state.resumeParseModel;
    this.resumeFileHash = state.resumeFileHash;
    this.createdAt = state.createdAt;
    this.updatedAt = state.updatedAt;
  }

  static rehydrate(state: ProfileState): Profile {
    if (state.name.length === 0 || state.name.length > 40) {
      throw new InvalidProfileError(`Profile.name must be 1..40 chars, got ${state.name.length}`);
    }
    if (state.yearsTotal !== undefined && (state.yearsTotal < 0 || state.yearsTotal > 80)) {
      throw new InvalidProfileError(`Profile.yearsTotal must be 0..80, got ${state.yearsTotal}`);
    }
    for (const category of state.preferredCategories) {
      if (!isJobCategory(category)) {
        throw new InvalidProfileError(`Unknown preferred_categories slug: ${String(category)}`);
      }
    }
    if (state.englishLevel !== undefined && !isCefrLevel(state.englishLevel)) {
      throw new InvalidProfileError(`Invalid englishLevel: ${String(state.englishLevel)}`);
    }
    for (const lang of state.languages) {
      if (!isCefrLevel(lang.level)) {
        throw new InvalidProfileError(`Invalid language level: ${String(lang.level)}`);
      }
    }
    return new Profile(state);
  }

  /**
   * Check whether this profile is ready to be used as a campaign source —
   * requires a name, at least one skill, and either headline or years_total.
   */
  isCampaignReady(): boolean {
    if (this.name.trim().length === 0) return false;
    if (this.skills.length === 0) return false;
    if ((this.headline ?? '').trim().length === 0 && this.yearsTotal === undefined) {
      return false;
    }
    return true;
  }
}

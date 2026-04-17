import 'server-only';
import {
  type CefrLevel,
  type EducationEntry,
  type ExperienceEntry,
  type JobCategory,
  type LanguageEntry,
  Profile,
  ProfileId,
  type ProfileRepo,
  type SaveProfileInput,
  type Skill,
  type UpdateProfileInput,
  isCefrLevel,
  isJobCategory,
} from '@ai-job-bot/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ProfileInsert, ProfileRow, ProfileUpdate } from './types';

/**
 * Supabase adapter for the `ProfileRepo` port (Phase 2).
 *
 * Runs with the service-role client — RLS is the browser-side trust boundary,
 * writes land here after the server has verified `initData` (see
 * `apps/web/lib/telegram/session.ts`).
 *
 * Default-flip: the wire protocol is two statements (demote siblings, then
 * write the new row). The partial-unique index `profiles_one_default_per_user`
 * is the correctness net — a concurrent flip hits SQLSTATE 23505 and surfaces
 * as an error to the caller. We do not wrap both statements in a Postgres
 * transaction from the client; acceptable for Phase 2 because the only writer
 * is the authenticated user's own session.
 */
export class SupabaseProfileRepo implements ProfileRepo {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToProfile(data) : null;
  }

  async findByUserId(userId: string): Promise<readonly Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(rowToProfile);
  }

  async findDefault(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToProfile(data) : null;
  }

  async create(input: SaveProfileInput): Promise<Profile> {
    const isDefault = input.isDefault ?? false;
    if (isDefault) await this.demoteDefaults(input.userId);

    const insert: ProfileInsert = {
      user_id: input.userId,
      name: input.name,
      is_default: isDefault,
      ...toWriteFields(input),
    };

    const { data, error } = await this.supabase
      .from('profiles')
      .insert(insert)
      .select('*')
      .single();
    if (error) throw error;
    return rowToProfile(data);
  }

  async update(input: UpdateProfileInput): Promise<Profile> {
    if (input.isDefault === true) {
      const { data: existing, error: findErr } = await this.supabase
        .from('profiles')
        .select('user_id, is_default')
        .eq('id', input.id)
        .maybeSingle();
      if (findErr) throw findErr;
      if (existing && !existing.is_default) {
        await this.demoteDefaults(existing.user_id);
      }
    }

    const patch: ProfileUpdate = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.isDefault !== undefined) patch.is_default = input.isDefault;
    Object.assign(patch, toWriteFields(input));

    const { data, error } = await this.supabase
      .from('profiles')
      .update(patch)
      .eq('id', input.id)
      .select('*')
      .single();
    if (error) throw error;
    return rowToProfile(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('profiles').delete().eq('id', id);
    if (error) throw error;
  }

  private async demoteDefaults(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);
    if (error) throw error;
  }
}

/**
 * Only present keys are forwarded to Supabase — skipping `undefined` respects
 * `exactOptionalPropertyTypes` on the port and keeps existing column values
 * intact on partial updates.
 */
function toWriteFields(input: SaveProfileInput | UpdateProfileInput): Partial<ProfileInsert> {
  const out: Record<string, unknown> = {};

  if (input.preferredCategories !== undefined) {
    out.preferred_categories = [...input.preferredCategories];
  }
  if (input.fullName !== undefined) out.full_name = input.fullName;
  if (input.email !== undefined) out.email = input.email;
  if (input.phone !== undefined) out.phone = input.phone;
  if (input.location !== undefined) out.location = input.location;
  if (input.timezone !== undefined) out.timezone = input.timezone;
  if (input.linkedinUrl !== undefined) out.linkedin_url = input.linkedinUrl;
  if (input.githubUrl !== undefined) out.github_url = input.githubUrl;
  if (input.telegramUrl !== undefined) out.telegram_url = input.telegramUrl;
  if (input.twitterUrl !== undefined) out.twitter_url = input.twitterUrl;
  if (input.portfolioUrl !== undefined) out.portfolio_url = input.portfolioUrl;
  if (input.headline !== undefined) out.headline = input.headline;
  if (input.summary !== undefined) out.summary = input.summary;
  if (input.yearsTotal !== undefined) out.years_total = input.yearsTotal;
  if (input.englishLevel !== undefined) out.english_level = input.englishLevel;

  if (input.skills !== undefined) out.skills = input.skills;
  if (input.experience !== undefined) out.experience = input.experience;
  if (input.education !== undefined) out.education = input.education;
  if (input.languages !== undefined) out.languages = input.languages;
  if (input.categoryFields !== undefined) out.category_fields = input.categoryFields;

  if (input.resumeStoragePath !== undefined) out.resume_storage_path = input.resumeStoragePath;
  if (input.resumeParsedAt !== undefined) out.resume_parsed_at = input.resumeParsedAt.toISOString();
  if (input.resumeParseModel !== undefined) out.resume_parse_model = input.resumeParseModel;
  if (input.resumeFileHash !== undefined) out.resume_file_hash = input.resumeFileHash;

  return out as Partial<ProfileInsert>;
}

function rowToProfile(row: ProfileRow): Profile {
  return Profile.rehydrate({
    id: ProfileId.from(row.id),
    userId: row.user_id,
    name: row.name,
    isDefault: row.is_default,
    preferredCategories: coerceCategories(row.preferred_categories),
    fullName: row.full_name ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    location: row.location ?? undefined,
    timezone: row.timezone ?? undefined,
    linkedinUrl: row.linkedin_url ?? undefined,
    githubUrl: row.github_url ?? undefined,
    telegramUrl: row.telegram_url ?? undefined,
    twitterUrl: row.twitter_url ?? undefined,
    portfolioUrl: row.portfolio_url ?? undefined,
    headline: row.headline ?? undefined,
    summary: row.summary ?? undefined,
    yearsTotal: row.years_total ?? undefined,
    englishLevel: coerceCefrLevel(row.english_level),
    skills: coerceSkills(row.skills),
    experience: coerceExperience(row.experience),
    education: coerceEducation(row.education),
    languages: coerceLanguages(row.languages),
    categoryFields: coerceCategoryFields(row.category_fields),
    resumeStoragePath: row.resume_storage_path ?? undefined,
    resumeParsedAt: row.resume_parsed_at ? new Date(row.resume_parsed_at) : undefined,
    resumeParseModel: row.resume_parse_model ?? undefined,
    resumeFileHash: row.resume_file_hash ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

function coerceCategories(value: readonly string[] | null): readonly JobCategory[] {
  if (!value) return [];
  return value.filter(isJobCategory);
}

function coerceCefrLevel(value: string | null): CefrLevel | undefined {
  return isCefrLevel(value) ? value : undefined;
}

function coerceSkills(value: unknown): readonly Skill[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null;
      const obj = item as Record<string, unknown>;
      if (typeof obj.name !== 'string' || obj.name.length === 0) return null;
      const skill: Skill = {
        name: obj.name,
        years: typeof obj.years === 'number' ? obj.years : undefined,
        level: isCefrLevel(obj.level) ? obj.level : undefined,
      };
      return skill;
    })
    .filter((s): s is Skill => s !== null);
}

function coerceExperience(value: unknown): readonly ExperienceEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null;
      const obj = item as Record<string, unknown>;
      if (typeof obj.company !== 'string' || typeof obj.role !== 'string') return null;
      if (typeof obj.startMonth !== 'string') return null;
      const entry: ExperienceEntry = {
        company: obj.company,
        role: obj.role,
        startMonth: obj.startMonth,
        endMonth: typeof obj.endMonth === 'string' ? obj.endMonth : null,
        description: typeof obj.description === 'string' ? obj.description : undefined,
        stack: Array.isArray(obj.stack)
          ? obj.stack.filter((s): s is string => typeof s === 'string')
          : undefined,
      };
      return entry;
    })
    .filter((e): e is ExperienceEntry => e !== null);
}

function coerceEducation(value: unknown): readonly EducationEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null;
      const obj = item as Record<string, unknown>;
      if (typeof obj.school !== 'string' || obj.school.length === 0) return null;
      const entry: EducationEntry = {
        school: obj.school,
        degree: typeof obj.degree === 'string' ? obj.degree : undefined,
        startMonth: typeof obj.startMonth === 'string' ? obj.startMonth : undefined,
        endMonth: typeof obj.endMonth === 'string' ? obj.endMonth : undefined,
      };
      return entry;
    })
    .filter((e): e is EducationEntry => e !== null);
}

function coerceLanguages(value: unknown): readonly LanguageEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null;
      const obj = item as Record<string, unknown>;
      if (typeof obj.code !== 'string' || !isCefrLevel(obj.level)) return null;
      const entry: LanguageEntry = { code: obj.code, level: obj.level };
      return entry;
    })
    .filter((l): l is LanguageEntry => l !== null);
}

function coerceCategoryFields(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  return value as Readonly<Record<string, unknown>>;
}

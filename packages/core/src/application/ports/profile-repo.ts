/**
 * ProfileRepo port.
 *
 * Implementations:
 *   - `apps/web/lib/supabase/profile-repo.ts` — real Supabase adapter (Phase 2).
 *   - `packages/core/test/fakes/fake-profile-repo.ts` — in-memory fake
 *     for unit + application-layer tests.
 *
 * Only the use cases call these methods; presentation never touches ports directly.
 */

import type { JobCategory } from '../../domain/job-category';
import type {
  CefrLevel,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  Profile,
  Skill,
} from '../../domain/profile';

export interface SaveProfileInput {
  readonly userId: string;
  readonly name: string;
  readonly isDefault?: boolean | undefined;
  readonly preferredCategories?: readonly JobCategory[] | undefined;
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
  readonly skills?: readonly Skill[] | undefined;
  readonly experience?: readonly ExperienceEntry[] | undefined;
  readonly education?: readonly EducationEntry[] | undefined;
  readonly languages?: readonly LanguageEntry[] | undefined;
  readonly categoryFields?: Readonly<Record<string, unknown>> | undefined;
  readonly resumeStoragePath?: string | undefined;
  readonly resumeParsedAt?: Date | undefined;
  readonly resumeParseModel?: string | undefined;
  readonly resumeFileHash?: string | undefined;
}

export interface UpdateProfileInput extends Partial<Omit<SaveProfileInput, 'userId'>> {
  readonly id: string;
}

export interface ProfileRepo {
  findById(id: string): Promise<Profile | null>;
  findByUserId(userId: string): Promise<readonly Profile[]>;
  findDefault(userId: string): Promise<Profile | null>;
  /**
   * Create a new profile row. If `isDefault` is true, this call MUST
   * atomically demote any existing default for the same user in the same
   * transaction (the adapter does the two-statement flip).
   */
  create(input: SaveProfileInput): Promise<Profile>;
  /**
   * Partial update by profile id. `isDefault: true` demotes any other default
   * for the same user in the same transaction. Returns the freshly-read row.
   */
  update(input: UpdateProfileInput): Promise<Profile>;
  delete(id: string): Promise<void>;
}

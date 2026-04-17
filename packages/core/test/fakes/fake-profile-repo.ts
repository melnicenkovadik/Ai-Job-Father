import type { Clock } from '../../src/application/ports/clock';
import type {
  ProfileRepo,
  SaveProfileInput,
  UpdateProfileInput,
} from '../../src/application/ports/profile-repo';
import { Profile, ProfileId, type ProfileState } from '../../src/domain/profile';

/**
 * In-memory `ProfileRepo` for application-layer tests. Mirrors the Supabase
 * adapter's "at most one default per user" invariant by flipping siblings
 * when a new default lands.
 */
export class FakeProfileRepo implements ProfileRepo {
  private readonly rows = new Map<string, Profile>();
  private sequence = 0;

  constructor(private readonly clock: Clock) {}

  async findById(id: string): Promise<Profile | null> {
    return this.rows.get(id) ?? null;
  }

  async findByUserId(userId: string): Promise<readonly Profile[]> {
    return [...this.rows.values()].filter((p) => p.userId === userId);
  }

  async findDefault(userId: string): Promise<Profile | null> {
    return [...this.rows.values()].find((p) => p.userId === userId && p.isDefault) ?? null;
  }

  async create(input: SaveProfileInput): Promise<Profile> {
    const isDefault = input.isDefault ?? this.isFirstForUser(input.userId);
    if (isDefault) this.demoteOthers(input.userId);
    const now = this.clock.now();
    const id = `prof-${++this.sequence}`;
    const profile = buildProfile({
      id,
      userId: input.userId,
      name: input.name,
      isDefault,
      createdAt: now,
      updatedAt: now,
      ...extractOptionalFields(input),
    });
    this.rows.set(id, profile);
    return profile;
  }

  async update(input: UpdateProfileInput): Promise<Profile> {
    const existing = this.rows.get(input.id);
    if (!existing) throw new Error(`FakeProfileRepo: profile ${input.id} not found`);
    if (input.isDefault === true && !existing.isDefault) {
      this.demoteOthers(existing.userId);
    }
    const now = this.clock.now();
    const stateOut: ProfileState = {
      id: existing.id,
      userId: existing.userId,
      name: input.name ?? existing.name,
      isDefault: input.isDefault ?? existing.isDefault,
      preferredCategories: input.preferredCategories ?? existing.preferredCategories,
      fullName: input.fullName ?? existing.fullName,
      email: input.email ?? existing.email,
      phone: input.phone ?? existing.phone,
      location: input.location ?? existing.location,
      timezone: input.timezone ?? existing.timezone,
      linkedinUrl: input.linkedinUrl ?? existing.linkedinUrl,
      githubUrl: input.githubUrl ?? existing.githubUrl,
      telegramUrl: input.telegramUrl ?? existing.telegramUrl,
      twitterUrl: input.twitterUrl ?? existing.twitterUrl,
      portfolioUrl: input.portfolioUrl ?? existing.portfolioUrl,
      headline: input.headline ?? existing.headline,
      summary: input.summary ?? existing.summary,
      yearsTotal: input.yearsTotal ?? existing.yearsTotal,
      englishLevel: input.englishLevel ?? existing.englishLevel,
      skills: input.skills ?? existing.skills,
      experience: input.experience ?? existing.experience,
      education: input.education ?? existing.education,
      languages: input.languages ?? existing.languages,
      categoryFields: input.categoryFields ?? existing.categoryFields,
      resumeStoragePath: input.resumeStoragePath ?? existing.resumeStoragePath,
      resumeParsedAt: input.resumeParsedAt ?? existing.resumeParsedAt,
      resumeParseModel: input.resumeParseModel ?? existing.resumeParseModel,
      resumeFileHash: input.resumeFileHash ?? existing.resumeFileHash,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    const profile = Profile.rehydrate(stateOut);
    this.rows.set(existing.id.value, profile);
    return profile;
  }

  async delete(id: string): Promise<void> {
    this.rows.delete(id);
  }

  private demoteOthers(userId: string): void {
    const now = this.clock.now();
    for (const [id, p] of this.rows) {
      if (p.userId === userId && p.isDefault) {
        this.rows.set(id, demoteDefault(p, now));
      }
    }
  }

  private isFirstForUser(userId: string): boolean {
    for (const p of this.rows.values()) {
      if (p.userId === userId) return false;
    }
    return true;
  }
}

function demoteDefault(p: Profile, now: Date): Profile {
  return Profile.rehydrate({
    id: p.id,
    userId: p.userId,
    name: p.name,
    isDefault: false,
    preferredCategories: p.preferredCategories,
    fullName: p.fullName,
    email: p.email,
    phone: p.phone,
    location: p.location,
    timezone: p.timezone,
    linkedinUrl: p.linkedinUrl,
    githubUrl: p.githubUrl,
    telegramUrl: p.telegramUrl,
    twitterUrl: p.twitterUrl,
    portfolioUrl: p.portfolioUrl,
    headline: p.headline,
    summary: p.summary,
    yearsTotal: p.yearsTotal,
    englishLevel: p.englishLevel,
    skills: p.skills,
    experience: p.experience,
    education: p.education,
    languages: p.languages,
    categoryFields: p.categoryFields,
    resumeStoragePath: p.resumeStoragePath,
    resumeParsedAt: p.resumeParsedAt,
    resumeParseModel: p.resumeParseModel,
    resumeFileHash: p.resumeFileHash,
    createdAt: p.createdAt,
    updatedAt: now,
  });
}

interface BuildInput {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly isDefault: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly preferredCategories?: readonly ProfileState['preferredCategories'][number][];
  readonly fullName?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly location?: string;
  readonly timezone?: string;
  readonly linkedinUrl?: string;
  readonly githubUrl?: string;
  readonly telegramUrl?: string;
  readonly twitterUrl?: string;
  readonly portfolioUrl?: string;
  readonly headline?: string;
  readonly summary?: string;
  readonly yearsTotal?: number;
  readonly englishLevel?: ProfileState['englishLevel'];
  readonly skills?: ProfileState['skills'];
  readonly experience?: ProfileState['experience'];
  readonly education?: ProfileState['education'];
  readonly languages?: ProfileState['languages'];
  readonly categoryFields?: ProfileState['categoryFields'];
  readonly resumeStoragePath?: string;
  readonly resumeParsedAt?: Date;
  readonly resumeParseModel?: string;
  readonly resumeFileHash?: string;
}

function buildProfile(input: BuildInput): Profile {
  return Profile.rehydrate({
    id: ProfileId.from(input.id),
    userId: input.userId,
    name: input.name,
    isDefault: input.isDefault,
    preferredCategories: input.preferredCategories ?? [],
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    location: input.location,
    timezone: input.timezone,
    linkedinUrl: input.linkedinUrl,
    githubUrl: input.githubUrl,
    telegramUrl: input.telegramUrl,
    twitterUrl: input.twitterUrl,
    portfolioUrl: input.portfolioUrl,
    headline: input.headline,
    summary: input.summary,
    yearsTotal: input.yearsTotal,
    englishLevel: input.englishLevel,
    skills: input.skills ?? [],
    experience: input.experience ?? [],
    education: input.education ?? [],
    languages: input.languages ?? [],
    categoryFields: input.categoryFields ?? {},
    resumeStoragePath: input.resumeStoragePath,
    resumeParsedAt: input.resumeParsedAt,
    resumeParseModel: input.resumeParseModel,
    resumeFileHash: input.resumeFileHash,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  });
}

function extractOptionalFields(
  input: SaveProfileInput,
): Omit<BuildInput, 'id' | 'userId' | 'name' | 'isDefault' | 'createdAt' | 'updatedAt'> {
  const out: Record<string, unknown> = {};
  const keys: Array<keyof SaveProfileInput> = [
    'preferredCategories',
    'fullName',
    'email',
    'phone',
    'location',
    'timezone',
    'linkedinUrl',
    'githubUrl',
    'telegramUrl',
    'twitterUrl',
    'portfolioUrl',
    'headline',
    'summary',
    'yearsTotal',
    'englishLevel',
    'skills',
    'experience',
    'education',
    'languages',
    'categoryFields',
    'resumeStoragePath',
    'resumeParsedAt',
    'resumeParseModel',
    'resumeFileHash',
  ];
  for (const key of keys) {
    const value = input[key];
    if (value !== undefined) out[key] = value;
  }
  return out as Omit<
    BuildInput,
    'id' | 'userId' | 'name' | 'isDefault' | 'createdAt' | 'updatedAt'
  >;
}

import type { Clock } from '../../src/application/ports/clock';
import type { UpsertUserInput, UserRepo } from '../../src/application/ports/user-repo';
import { type TelegramId, User, UserId } from '../../src/domain/user';

/**
 * In-memory fake used by core use-case tests.
 * Deterministic UUIDs via a monotonic counter — `fakeUuid(n) = 'u-{n}'`.
 */
export class FakeUserRepo implements UserRepo {
  private readonly byTelegramId = new Map<number, User>();
  private counter: number;

  constructor(
    private readonly clock: Clock,
    initialCounter = 1,
  ) {
    this.counter = initialCounter;
  }

  async findByTelegramId(telegramId: TelegramId): Promise<User | null> {
    return this.byTelegramId.get(telegramId.value) ?? null;
  }

  async upsert(input: UpsertUserInput): Promise<User> {
    const existing = this.byTelegramId.get(input.telegramId.value);
    const now = this.clock.now();
    const state = {
      id: existing?.id ?? UserId.from(`u-${this.counter++}`),
      telegramId: input.telegramId,
      locale: input.locale,
      isPremium: input.isPremium,
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      timezone: input.timezone,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const user = User.rehydrate(state);
    this.byTelegramId.set(input.telegramId.value, user);
    return user;
  }

  all(): User[] {
    return [...this.byTelegramId.values()];
  }

  get size(): number {
    return this.byTelegramId.size;
  }
}

/**
 * Per-profile accent tint.
 *
 * The list at /profiles is gnarly when two profiles parse from the same
 * CV — same `fullName`, same `headline`, only `profile.name` ("WITH AI",
 * "WITHout AI", "Default profile") tells them apart. To make scanning a
 * many-profile list cheap, every profile gets a stable colour pulled
 * from an 8-bucket palette via a deterministic hash of its `name`.
 *
 * Same name → same colour (across reloads, devices, sessions).
 * Different name → different colour (most of the time — 8 buckets, so
 * collisions exist; renaming nudges into a new bucket if it matters).
 *
 * The palette is intentionally muted (60% saturation, 55% lightness)
 * so the tint reads as an accent, not as a banner. Used as a
 * left-border + a soft outer shadow on `<ProfileCard>`.
 */

export interface ProfileTint {
  /** Solid hex (no alpha). For the left border. */
  readonly border: string;
  /** Same hue at low alpha. For the outer glow / box-shadow. */
  readonly glow: string;
  /** Background tint for the (small) name pill. */
  readonly pill: string;
  /** Foreground for the name pill. */
  readonly pillText: string;
}

const PALETTE: readonly ProfileTint[] = [
  {
    border: 'oklch(0.66 0.15 25)', // coral
    glow: 'color-mix(in oklch, oklch(0.66 0.15 25) 18%, transparent)',
    pill: 'color-mix(in oklch, oklch(0.66 0.15 25) 14%, transparent)',
    pillText: 'oklch(0.5 0.15 25)',
  },
  {
    border: 'oklch(0.7 0.14 60)', // orange
    glow: 'color-mix(in oklch, oklch(0.7 0.14 60) 18%, transparent)',
    pill: 'color-mix(in oklch, oklch(0.7 0.14 60) 14%, transparent)',
    pillText: 'oklch(0.55 0.14 60)',
  },
  {
    border: 'oklch(0.7 0.14 95)', // amber/yellow
    glow: 'color-mix(in oklch, oklch(0.7 0.14 95) 18%, transparent)',
    pill: 'color-mix(in oklch, oklch(0.7 0.14 95) 14%, transparent)',
    pillText: 'oklch(0.5 0.14 95)',
  },
  {
    border: 'oklch(0.7 0.13 145)', // green
    glow: 'color-mix(in oklch, oklch(0.7 0.13 145) 18%, transparent)',
    pill: 'color-mix(in oklch, oklch(0.7 0.13 145) 14%, transparent)',
    pillText: 'oklch(0.5 0.13 145)',
  },
  {
    border: 'oklch(0.68 0.13 195)', // teal
    glow: 'color-mix(in oklch, oklch(0.68 0.13 195) 18%, transparent)',
    pill: 'color-mix(in oklch, oklch(0.68 0.13 195) 14%, transparent)',
    pillText: 'oklch(0.5 0.13 195)',
  },
  {
    border: 'oklch(0.68 0.16 240)', // blue
    glow: 'color-mix(in oklch, oklch(0.68 0.16 240) 18%, transparent)',
    pill: 'color-mix(in oklch, oklch(0.68 0.16 240) 14%, transparent)',
    pillText: 'oklch(0.5 0.16 240)',
  },
  {
    border: 'oklch(0.66 0.18 290)', // indigo / violet
    glow: 'color-mix(in oklch, oklch(0.66 0.18 290) 18%, transparent)',
    pill: 'color-mix(in oklch, oklch(0.66 0.18 290) 14%, transparent)',
    pillText: 'oklch(0.5 0.18 290)',
  },
  {
    border: 'oklch(0.7 0.16 340)', // pink / magenta
    glow: 'color-mix(in oklch, oklch(0.7 0.16 340) 18%, transparent)',
    pill: 'color-mix(in oklch, oklch(0.7 0.16 340) 14%, transparent)',
    pillText: 'oklch(0.5 0.16 340)',
  },
];

/**
 * Pick a stable tint for a given profile name. Empty / nullish names
 * fall back to the first palette entry (so every profile renders some
 * tint, no special-case handling on the consumer).
 *
 * Hash: djb2 (small, deterministic, fits in 32-bit int range comfortably
 * for typical profile names).
 */
export function profileTint(name: string | null | undefined): ProfileTint {
  if (!name) return PALETTE[0] as ProfileTint;
  let h = 5381;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) + h + name.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % PALETTE.length;
  return PALETTE[idx] as ProfileTint;
}

/** Test-only export — keeps the palette length stable in unit tests. */
export const PROFILE_TINT_PALETTE_SIZE = PALETTE.length;

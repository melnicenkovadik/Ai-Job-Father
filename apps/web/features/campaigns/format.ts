/**
 * Tiny formatters used by dashboard + campaign-detail. Kept colocated so we
 * can swap the locale strings without touching the data layer.
 */

const RU_RTF =
  typeof Intl !== 'undefined' ? new Intl.RelativeTimeFormat('ru', { numeric: 'auto' }) : null;

const STEPS: ReadonlyArray<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
];

export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diffMs = then - now.getTime();
  for (const { unit, ms } of STEPS) {
    if (Math.abs(diffMs) >= ms) {
      const value = Math.round(diffMs / ms);
      return RU_RTF ? RU_RTF.format(value, unit) : `${value} ${unit}`;
    }
  }
  return RU_RTF ? RU_RTF.format(0, 'second') : 'сейчас';
}

/**
 * Display price in USD ("$12.50"). Stars / TON conversions land in Wave D.
 */
export function formatPriceUsd(amountCents: number): string {
  const dollars = amountCents / 100;
  return `$${dollars.toFixed(2)}`;
}

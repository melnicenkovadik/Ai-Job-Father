import { cn } from '@/lib/cn';
import type { JobCategory } from '@ai-job-bot/core';
import * as React from 'react';

const GLYPH: Readonly<Record<JobCategory, string>> = {
  tech: '⌘',
  design: '◐',
  marketing: '◈',
  sales: '↗',
  product: '◉',
  finance: '$',
  hr: '◍',
  support: '◯',
  content: '¶',
  ops: '⚙',
  data: '≈',
  web3: '◆',
};

type ChipSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<ChipSize, string> = {
  sm: 'size-7 text-[13px]',
  md: 'size-9 text-[15px]',
  lg: 'size-11 text-[18px]',
};

export interface CategoryChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  category: JobCategory;
  size?: ChipSize;
}

export const CategoryChip = React.forwardRef<HTMLSpanElement, CategoryChipProps>(
  ({ category, size = 'md', className, ...rest }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-2)] font-bold text-[var(--color-accent)]',
        SIZE_CLASS[size],
        className,
      )}
      aria-hidden
      {...rest}
    >
      {GLYPH[category]}
    </span>
  ),
);
CategoryChip.displayName = 'CategoryChip';

export const CATEGORY_GLYPH = GLYPH;

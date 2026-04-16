import { cn } from '@/lib/cn';
import * as React from 'react';
import { Stack } from './Stack';

export interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
}

/**
 * Titled content block. Renders a `<section>` with optional header + description
 * and a Stack body. `min-w-0` propagates so long titles in CEE locales wrap
 * instead of triggering horizontal scroll.
 */
export const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, title, description, children, ...rest }, ref) => (
    <section ref={ref} className={cn('flex min-w-0 flex-col gap-3 px-4 py-6', className)} {...rest}>
      {(title ?? description) ? (
        <header className="flex min-w-0 flex-col gap-1">
          {title !== undefined && (
            <h2 className="text-lg font-semibold leading-snug [overflow-wrap:anywhere]">{title}</h2>
          )}
          {description !== undefined && (
            <p className="text-sm opacity-70 [overflow-wrap:anywhere]">{description}</p>
          )}
        </header>
      ) : null}
      <Stack gap={3}>{children}</Stack>
    </section>
  ),
);
Section.displayName = 'Section';

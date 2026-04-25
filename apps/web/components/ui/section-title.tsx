import { cn } from '@/lib/cn';
import * as React from 'react';

export interface SectionTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 2 | 3;
}

export const SectionTitle = React.forwardRef<HTMLHeadingElement, SectionTitleProps>(
  ({ level = 2, className, children, ...rest }, ref) => {
    const Tag = `h${level}` as 'h2' | 'h3';
    return (
      <Tag
        ref={ref}
        className={cn(
          'min-w-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-mute)]',
          className,
        )}
        {...rest}
      >
        {children}
      </Tag>
    );
  },
);
SectionTitle.displayName = 'SectionTitle';

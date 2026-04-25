import { cn } from '@/lib/cn';
import * as React from 'react';

type HeadlineSize = 'sm' | 'md' | 'lg';
type HeadlineLevel = 1 | 2 | 3;

export interface HeadlineProps extends React.HTMLAttributes<HTMLHeadingElement> {
  size?: HeadlineSize;
  level?: HeadlineLevel;
}

const SIZE_CLASS: Record<HeadlineSize, string> = {
  sm: 'text-[22px] leading-tight',
  md: 'text-[28px] leading-[1.1]',
  lg: 'text-[34px] leading-[1.05]',
};

export const Headline = React.forwardRef<HTMLHeadingElement, HeadlineProps>(
  ({ size = 'lg', level = 1, className, children, ...rest }, ref) => {
    const Tag = `h${level}` as 'h1' | 'h2' | 'h3';
    return (
      <Tag
        ref={ref}
        className={cn(
          'min-w-0 font-bold tracking-tight text-[var(--color-text)] [overflow-wrap:anywhere] whitespace-pre-line',
          SIZE_CLASS[size],
          className,
        )}
        {...rest}
      >
        {children}
      </Tag>
    );
  },
);
Headline.displayName = 'Headline';

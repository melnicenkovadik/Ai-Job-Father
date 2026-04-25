import type { SVGProps } from 'react';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  size?: number;
}

const stroke = (size: number, props: Omit<IconProps, 'size'>) =>
  ({
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  }) satisfies SVGProps<SVGSVGElement>;

const filled = (size: number, viewBox: string, props: Omit<IconProps, 'size'>) =>
  ({
    width: size,
    height: size,
    viewBox,
    fill: 'currentColor',
    ...props,
  }) satisfies SVGProps<SVGSVGElement>;

export const Icon = {
  Star: ({ size = 16, ...rest }: IconProps) => (
    <svg {...filled(size, '0 0 24 24', rest)}>
      <title>Star</title>
      <path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7.3L12 17.7 5.7 21.5l1.7-7.3L2 9.5l7.1-.6z" />
    </svg>
  ),
  Ton: ({ size = 16, ...rest }: IconProps) => (
    <svg {...filled(size, '0 0 24 24', rest)}>
      <title>TON</title>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.6 7.3l-4 8.4c-.2.4-.8.4-1 0L7.4 9.3c-.3-.6.1-1.3.7-1.3h7.8c.6 0 1 .7.7 1.3zM11.3 9H9l2.3 4.8V9zm1.4 0v4.8L15 9h-2.3z" />
    </svg>
  ),
  Spark: ({ size = 16, ...rest }: IconProps) => (
    <svg {...filled(size, '0 0 24 24', rest)}>
      <title>Spark</title>
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
    </svg>
  ),
  Flame: ({ size = 16, ...rest }: IconProps) => (
    <svg {...filled(size, '0 0 24 24', rest)}>
      <title>Flame</title>
      <path d="M12 2s4 4 4 8a4 4 0 11-8 0c0-1 0-2 1-3 0 2 1 3 2 3-1-2-1-5 1-8zm-5 12a5 5 0 1010 0c0-2-1-4-2-5 0 1-1 2-2 2 1-1 1-3-1-5-3 2-5 5-5 8z" />
    </svg>
  ),
  Dot: ({ size = 8, ...rest }: IconProps) => (
    <svg {...filled(size, '0 0 8 8', rest)}>
      <title>Dot</title>
      <circle cx="4" cy="4" r="4" />
    </svg>
  ),
  Check: ({ size = 16, ...rest }: IconProps) => (
    <svg {...stroke(size, rest)}>
      <title>Check</title>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  ChevronRight: ({ size = 16, ...rest }: IconProps) => (
    <svg {...stroke(size, rest)}>
      <title>Chevron right</title>
      <path d="M9 6l6 6-6 6" />
    </svg>
  ),
  ChevronLeft: ({ size = 16, ...rest }: IconProps) => (
    <svg {...stroke(size, rest)}>
      <title>Chevron left</title>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  ),
  Plus: ({ size = 16, ...rest }: IconProps) => (
    <svg {...stroke(size, rest)}>
      <title>Plus</title>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Close: ({ size = 16, ...rest }: IconProps) => (
    <svg {...stroke(size, rest)}>
      <title>Close</title>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  Upload: ({ size = 16, ...rest }: IconProps) => (
    <svg {...stroke(size, rest)}>
      <title>Upload</title>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  ),
  Doc: ({ size = 16, ...rest }: IconProps) => (
    <svg {...stroke(size, rest)}>
      <title>Document</title>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h6" />
    </svg>
  ),
  Search: ({ size = 16, ...rest }: IconProps) => (
    <svg {...stroke(size, rest)}>
      <title>Search</title>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  ),
  Settings: ({ size = 16, ...rest }: IconProps) => (
    <svg {...stroke(size, rest)}>
      <title>Settings</title>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  User: ({ size = 16, ...rest }: IconProps) => (
    <svg {...stroke(size, rest)}>
      <title>User</title>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Clock: ({ size = 16, ...rest }: IconProps) => (
    <svg {...stroke(size, rest)}>
      <title>Clock</title>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  Arrow: ({ size = 16, ...rest }: IconProps) => (
    <svg {...stroke(size, rest)}>
      <title>Arrow right</title>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  Globe: ({ size = 16, ...rest }: IconProps) => (
    <svg {...stroke(size, rest)}>
      <title>Globe</title>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18 14 14 0 010-18z" />
    </svg>
  ),
  Alert: ({ size = 16, ...rest }: IconProps) => (
    <svg {...stroke(size, rest)}>
      <title>Alert</title>
      <path d="M12 2L2 20h20L12 2z" />
      <path d="M12 10v5M12 18h.01" />
    </svg>
  ),
  Wifi: ({ size = 14, ...rest }: IconProps) => (
    <svg width={size} height={size * 0.7} viewBox="0 0 16 11" fill="currentColor" {...rest}>
      <title>Wi-Fi</title>
      <path d="M8 3.2C10.3 3.2 12.4 4.1 13.9 5.6L15 4.5C13.2 2.7 10.7 1.5 8 1.5 5.3 1.5 2.8 2.7 1 4.5l1.1 1.1C3.6 4.1 5.7 3.2 8 3.2z" />
      <path d="M8 6.8c1.4 0 2.6.5 3.5 1.4l1.1-1.1C11.3 5.9 9.7 5.1 8 5.1s-3.3.8-4.6 2l1.1 1.1c.9-.9 2.1-1.4 3.5-1.4z" />
      <circle cx="8" cy="10" r="1.3" />
    </svg>
  ),
};

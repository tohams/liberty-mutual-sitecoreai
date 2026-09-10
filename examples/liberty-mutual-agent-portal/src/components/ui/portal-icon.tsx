import type { SVGProps } from "react";

export type IconName =
  | "grid"
  | "arrow"
  | "chevron"
  | "search"
  | "bell"
  | "plus"
  | "check"
  | "clock"
  | "file"
  | "briefcase"
  | "users"
  | "book"
  | "growth"
  | "headset"
  | "external"
  | "close"
  | "menu"
  | "shield"
  | "home"
  | "car"
  | "building"
  | "pin"
  | "download"
  | "bookmark"
  | "mail"
  | "phone"
  | "logout"
  | "filter"
  | "eye"
  | "lock"
  | "leaf"
  | "info";

const paths: Record<IconName, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  arrow: (
    <>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  plus: <path d="M12 4v16M4 12h16" />,
  check: <path d="m5 12 4 4L19 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H5v18h14V8l-5-5ZM14 3v5h5M8 12h8M8 16h6" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V3h8v4M3 12c5 3 13 3 18 0M10 14h4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M17 13a5 5 0 0 1 4 5v3" />
    </>
  ),
  book: (
    <>
      <path d="M12 5c-4-3-7-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-6-2-10 1v15" />
    </>
  ),
  growth: (
    <>
      <path d="M4 20V4M4 20h17M7 14l5-5 4 3 5-7M17 5h4v4" />
    </>
  ),
  headset: (
    <>
      <path d="M3 13v-2a9 9 0 0 1 18 0v7a3 3 0 0 1-3 3h-4" />
      <rect x="2" y="11" width="4" height="7" rx="2" />
      <rect x="18" y="11" width="4" height="7" rx="2" />
    </>
  ),
  external: (
    <>
      <path d="M14 3h7v7M21 3 10 14M11 4H4v16h16v-7" />
    </>
  ),
  close: <path d="m5 5 14 14M19 5 5 19" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  shield: (
    <>
      <path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  home: <path d="m3 10 9-8 9 8v11h-7v-7h-4v7H3V10Z" />,
  car: (
    <>
      <path d="M3 10 5 4h14l2 6v9H3v-9ZM3 10h18M6 14h2M16 14h2M5 19v2M19 19v2" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V3h12v18M16 9h4v12M2 21h20M8 7h4M8 11h4M8 15h4M8 21v-2h4v2" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
    </>
  ),
  bookmark: <path d="M6 3h12v19l-6-4-6 4V3Z" />,
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 5 10 8L22 5" />
    </>
  ),
  phone: (
    <path d="m8 3 3 5-3 3 5 5 3-3 5 3c0 4-3 6-6 4C9 18 4 13 2 7 1 4 4 1 8 3Z" />
  ),
  logout: (
    <>
      <path d="M9 3H3v18h6M9 12h12m-5-5 5 5-5 5" />
    </>
  ),
  filter: <path d="M3 5h18M6 12h12M9 19h6" />,
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M7 10V7a5 5 0 0 1 10 0v3M12 14v3" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 3C8 1 2 7 5 15c8 7 17 0 15-12ZM4 21 15 10" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7h.01" />
    </>
  ),
};

export function PortalIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

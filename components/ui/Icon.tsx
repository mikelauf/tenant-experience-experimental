import type { IconName } from "@/lib/data/types";

type UiIcon =
  | "arrow-right"
  | "arrow-left"
  | "arrow-up-right"
  | "close"
  | "heart"
  | "heart-fill"
  | "plus"
  | "minus"
  | "chevron-right"
  | "chevron-down"
  | "chevron-left"
  | "user"
  | "home"
  | "spaces"
  | "fitness"
  | "programming"
  | "plans"
  | "grid"
  | "sliders"
  | "info"
  | "alert"
  | "refresh"
  | "external"
  | "ticket";

export type AnyIcon = IconName | UiIcon;

const paths: Record<AnyIcon, React.ReactNode> = {
  view: (
    <>
      <path d="M3 18h18M5 18V8l7-4 7 4v10" />
      <path d="M8 18v-4a4 4 0 0 1 8 0v4" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  tree: (
    <>
      <path d="M12 3 6.5 11H9l-4 6h14l-4-6h2.5L12 3Z" />
      <path d="M12 17v4" />
    </>
  ),
  glass: (
    <>
      <path d="M7 3h10l-1 6a4 4 0 0 1-8 0L7 3Z" />
      <path d="M12 13v7M8.5 20.5h7" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>
  ),
  screen: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0" />
      <circle cx="12" cy="19" r="0.6" fill="currentColor" />
    </>
  ),
  chair: (
    <>
      <path d="M7 11V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6" />
      <path d="M5 11h14v4H5zM7 15v6M17 15v6" />
    </>
  ),
  table: (
    <>
      <ellipse cx="12" cy="8" rx="9" ry="3" />
      <path d="M12 11v10M8 21h8" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" />
      <path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3.5v2M12 3.5v2" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  access: (
    <>
      <circle cx="12" cy="4.5" r="1.5" />
      <path d="M5 8h14M12 8v6M8.5 21l3.5-7 3.5 7" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14a6 6 0 0 1 3 6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  whiteboard: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M7 20l2-4M17 20l-2-4M7 9.5c2-2 3 1 5-1s3 1 5-1" />
    </>
  ),
  video: (
    <>
      <rect x="2.5" y="6" width="13" height="12" rx="2" />
      <path d="m15.5 10.5 6-3.5v10l-6-3.5" />
    </>
  ),
  bike: (
    <>
      <circle cx="5.5" cy="16.5" r="3.5" />
      <circle cx="18.5" cy="16.5" r="3.5" />
      <path d="M5.5 16.5 9 9h6l3.5 7.5M9 9 12 16.5h-1M13.5 5.5H16l-1 3.5" />
    </>
  ),
  snow: <path d="M12 2v20M4 6.5l16 11M4 17.5l16-11M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5" />,
  flame: <path d="M12 21c-4 0-7-2.7-7-6.5 0-3.3 2.5-5.3 3.5-8 1 1.5 2 2 3 2.5C12 6 12.5 4 14 2.5c.5 3 5 5.5 5 11 0 4.3-3 7.5-7 7.5Z" />,
  towel: (
    <>
      <path d="M6 3h12v14H6z" />
      <path d="M6 17c0 2 1 4 3 4h9V7M9 7h6" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10.5" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  star: <path d="m12 3 2.6 5.8 6.4.6-4.8 4.3 1.4 6.3L12 16.8 6.4 20l1.4-6.3L3 9.4l6.4-.6L12 3Z" />,
  leaf: (
    <>
      <path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15" />
      <path d="M5 19c3-4 6-7 10-9" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  bolt: <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8Z" />,
  shield: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6L12 3Z" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  "arrow-right": <path d="M4 12h16M14 6l6 6-6 6" />,
  "arrow-left": <path d="M20 12H4M10 6l-6 6 6 6" />,
  "arrow-up-right": <path d="M7 17 17 7M8 7h9v9" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  heart: <path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 6.6a4.5 4.5 0 0 1 8 2.9c0 6.1-8 11-8 11Z" />,
  "heart-fill": <path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 6.6a4.5 4.5 0 0 1 8 2.9c0 6.1-8 11-8 11Z" fill="currentColor" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  "chevron-right": <path d="m9 5 7 7-7 7" />,
  "chevron-left": <path d="m15 5-7 7 7 7" />,
  "chevron-down": <path d="m5 9 7 7 7-7" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  home: (
    <>
      <path d="M12 3 4 20h16L12 3Z" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  spaces: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M12 5v14M3.5 12H12" />
    </>
  ),
  fitness: <path d="M3 12h2M19 12h2M5 8.5v7M19 8.5v7M7.5 6.5v11M16.5 6.5v11M7.5 12h9" />,
  programming: (
    <>
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4V7.5Z" />
      <path d="M14 6v12" strokeDasharray="1.5 2" />
    </>
  ),
  plans: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4M8 14.5l2 2 4-4" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  sliders: <path d="M4 7h10M18 7h2M4 17h2M10 17h10M16 4.5v5M8 14.5v5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5v.5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 2.5 20h19L12 3.5Z" />
      <path d="M12 10v4.5M12 17.2v.3" />
    </>
  ),
  refresh: <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  ticket: (
    <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4V7.5Z" />
  ),
};

export function Icon({ name, size = 20, className, strokeWidth = 1.5 }: { name: AnyIcon; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

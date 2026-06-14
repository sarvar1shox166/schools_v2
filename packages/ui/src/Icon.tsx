import type { CSSProperties, ReactNode } from "react";

const ICONS: Record<string, ReactNode> = {
  dashboard: (<><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/></>),
  clock: (<><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.4 2"/></>),
  calendar: (<><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/></>),
  teacher: (<><path d="M2.5 8.5 12 4l9.5 4.5L12 13z"/><path d="M6 10.6V15c0 0 2.4 2 6 2s6-2 6-2v-4.4"/><path d="M21.5 8.7v4.6"/></>),
  students: (<><circle cx="9" cy="8" r="3.3"/><path d="M3.4 19.5c0-3.1 2.6-5.2 5.6-5.2s5.6 2.1 5.6 5.2"/><path d="M16.2 5.2a3.3 3.3 0 0 1 0 5.9"/><path d="M17.8 14.7c2.4.5 4.2 2.4 4.2 4.9"/></>),
  groups: (<><circle cx="12" cy="8" r="3"/><path d="M7 18.7c0-2.9 2.2-4.7 5-4.7s5 1.8 5 4.7"/><circle cx="4.8" cy="10.2" r="2.1"/><circle cx="19.2" cy="10.2" r="2.1"/><path d="M2.3 17.6c0-2 1.2-3.4 2.9-3.6"/><path d="M21.7 17.6c0-2-1.2-3.4-2.9-3.6"/></>),
  attendance: (<><rect x="5" y="4" width="14" height="17" rx="2.6"/><rect x="9" y="2.6" width="6" height="3.8" rx="1.4"/><path d="M9 13.2l2 2 4-4.4"/></>),
  payments: (<><rect x="2.5" y="5" width="19" height="14" rx="2.6"/><path d="M2.5 9.6h19"/><path d="M6 15.4h4"/></>),
  income: (<><rect x="3" y="6.4" width="18" height="12.4" rx="3"/><path d="M3 8.6a2 2 0 0 1 2-2.1h11.5"/><path d="M21 11.4h-4.4a2.1 2.1 0 0 0 0 4.2H21"/><circle cx="16.8" cy="13.5" r="0.95" fill="currentColor" stroke="none"/></>),
  bell: (<><path d="M6 9.5a6 6 0 0 1 12 0c0 5 2 6.7 2 6.7H4s2-1.7 2-6.7z"/><path d="M9.4 19.3a2.7 2.7 0 0 0 5.2 0"/></>),
  reports: (<><path d="M4 4v16h16"/><rect x="7" y="12" width="2.6" height="5.5" rx="0.9"/><rect x="11.7" y="8.5" width="2.6" height="9" rx="0.9"/><rect x="16.4" y="14.5" width="2.6" height="3" rx="0.9"/></>),
  search: (<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>),
  sun: (<><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.3M12 19.2v2.3M21.5 12h-2.3M4.8 12H2.5M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6"/></>),
  moon: (<><path d="M20.5 14.8A8.3 8.3 0 1 1 9.2 3.5a6.5 6.5 0 0 0 11.3 11.3z"/></>),
  plus: (<><path d="M12 5v14M5 12h14"/></>),
  check: (<><path d="M5 12.5l4.5 4.5L19 6.5"/></>),
  x: (<><path d="M6 6l12 12M18 6 6 18"/></>),
  chevronRight: (<><path d="M9 5l7 7-7 7"/></>),
  chevronDown: (<><path d="M5 9l7 7 7-7"/></>),
  chevronLeft: (<><path d="M15 5l-7 7 7 7"/></>),
  arrowUpRight: (<><path d="M7 17 17 7"/><path d="M8 7h9v9"/></>),
  arrowRight: (<><path d="M4 12h15"/><path d="M13 6l6 6-6 6"/></>),
  filter: (<><path d="M4 5.5h16l-6.2 7.4V19l-3.6-1.6v-4.5z"/></>),
  dots: (<><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/></>),
  dotsV: (<><circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none"/></>),
  phone: (<><path d="M6.5 3.5C5.1 3.5 4 4.6 4 6c0 8 6 14 14 14 1.4 0 2.5-1.1 2.5-2.5v-2.2c0-.6-.4-1.2-1-1.3l-3-.9c-.6-.2-1.2 0-1.5.5l-.7 1c-2.4-1.1-4.4-3.1-5.5-5.5l1-.7c.5-.3.7-.9.5-1.5l-.9-3c-.2-.6-.7-1-1.3-1z"/></>),
  mail: (<><rect x="3" y="5" width="18" height="14" rx="2.6"/><path d="M3.6 7l8.4 5.8L20.4 7"/></>),
  settings: (<><path d="M4 7h9.5"/><path d="M18 7h2"/><circle cx="16" cy="7" r="2.1"/><path d="M4 17h2"/><path d="M10.5 17H20"/><circle cx="8" cy="17" r="2.1"/></>),
  logout: (<><path d="M15 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h9"/><path d="M11 12h9"/><path d="M17 8l4 4-4 4"/></>),
  user: (<><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/></>),
  trendingUp: (<><path d="M3 16l5.5-5.5 4 3L19 6"/><path d="M15 6h5v5"/></>),
  trendingDown: (<><path d="M3 8l5.5 5.5 4-3L19 18"/><path d="M15 18h5v-5"/></>),
  alert: (<><path d="M10.3 4.2 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.5"/><circle cx="12" cy="17.3" r="0.7" fill="currentColor" stroke="none"/></>),
  download: (<><path d="M12 3.5v11"/><path d="M8 10.5l4 4 4-4"/><path d="M5 20h14"/></>),
  edit: (<><path d="M4 20h4L18.5 9.5l-4-4L4 16z"/><path d="M13 7l4 4"/></>),
  trash: (<><path d="M5 7h14"/><path d="M9.5 7V4.8h5V7"/><path d="M6.6 7l.8 12.6h9.2L17.4 7"/><path d="M10.2 11v5M13.8 11v5"/></>),
  eye: (<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.9"/></>),
  star: (<><path d="M12 3.4l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.3 2.8 1-5.9L3.5 9.6l5.9-.8z"/></>),
  message: (<><path d="M20 13.5a2.5 2.5 0 0 1-2.5 2.5H9l-4.5 3.5V6.5A2.5 2.5 0 0 1 7 4h10.5A2.5 2.5 0 0 1 20 6.5z"/></>),
  pin: (<><path d="M12 21.5s7-5.7 7-11.5a7 7 0 0 0-14 0c0 5.8 7 11.5 7 11.5z"/><circle cx="12" cy="10" r="2.6"/></>),
  award: (<><circle cx="12" cy="9" r="5.2"/><path d="M9 13.4 8 21l4-2.2L16 21l-1-7.6"/></>),
  target: (<><circle cx="12" cy="12" r="8.3"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></>),
  layers: (<><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></>),
  refresh: (<><path d="M20 11.5A8 8 0 0 0 6 6.3L4 8.2"/><path d="M4 4v4.2h4.2"/><path d="M4 12.5a8 8 0 0 0 14 5.2l2-1.9"/><path d="M20 20v-4.2h-4.2"/></>),
  crown: (<><path d="M4 18.5h16M4.5 16.5l-1.3-8 5 4 3.8-7 3.8 7 5-4-1.3 8z"/></>),
  book: (<><path d="M5 5a2 2 0 0 1 2-2h11v16H7a2 2 0 0 0-2 2z"/><path d="M5 19a2 2 0 0 1 2-2h11"/></>),
  flag: (<><path d="M6 21V4"/><path d="M6 4.5h11l-2 3.2 2 3.2H6"/></>),
  percent: (<><circle cx="7.5" cy="7.5" r="2.6"/><circle cx="16.5" cy="16.5" r="2.6"/><path d="M6 18 18 6"/></>),
  hash: (<><path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16"/></>),
  wallet: (<><rect x="3" y="6.4" width="18" height="12.4" rx="3"/><path d="M3 8.6a2 2 0 0 1 2-2.1h11.5"/><path d="M21 11.4h-4.4a2.1 2.1 0 0 0 0 4.2H21"/></>),
  chevronsLeft: (<><path d="M11 6l-6 6 6 6M18 6l-6 6 6 6"/></>),
  copy: (<><rect x="8" y="8" width="12" height="12" rx="2.4"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>),
  zap: (<><path d="M13 3 5 13h6l-1 8 8-10h-6z"/></>),
  pieces: (<><path d="M9 21h6M8.5 18h7M9.5 18c-.5-3 1-4.5 1-6.5M14.5 18c.5-3-1-4.5-1-6.5"/><circle cx="12" cy="6.5" r="2.6"/><path d="M9.4 11.5h5.2"/></>),
  message2: (<><path d="M21 11.5a8 8 0 0 1-11.5 7.2L4 20l1.3-5A8 8 0 1 1 21 11.5z"/></>),
  calendarCheck: (<><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M8.5 14.5l2.2 2.2 4.3-4.4"/></>),
  grid: (<><rect x="3" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8"/></>),
  list: (<><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1.1" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r="1.1" fill="currentColor" stroke="none"/></>),
  video: (<><rect x="2.5" y="5.5" width="14" height="13" rx="2.4"/><path d="M16.5 10.8l5-3.2v8.8l-5-3.2z"/></>),
  play: (<><circle cx="12" cy="12" r="9.3"/><path d="M10 8.3v7.4l6-3.7z" fill="currentColor" stroke="none"/></>),
  archive: (<><rect x="2.5" y="4" width="19" height="5" rx="1.6"/><path d="M4.2 9v8.4a2 2 0 0 0 2 2h11.6a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/></>),
  bookOpen: (<><path d="M12 5.5c-1.8-1.3-4.5-1.7-7-1.3v13.3c2.5-.4 5.2 0 7 1.3 1.8-1.3 4.5-1.7 7-1.3V4.2c-2.5-.4-5.2 0-7 1.3z"/><path d="M12 5.5v13.3"/></>),
  swords: (<><path d="M5 3l6.5 6.5M19 3l-6.5 6.5"/><path d="M5 21l5-5M19 21l-5-5"/><path d="M9 9l-5.5 5.5M15 9l5.5 5.5"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/></>),
  flame: (<><path d="M12 2.5c1.5 2.5 4.5 4.8 4.5 8.2a4.5 4.5 0 0 1-9 0c0-1.1.3-2 .8-2.9-.2 1.3.3 2.1 1.1 2.4-.6-2.5.6-5 2.6-7.7z"/></>),
  gift: (<><rect x="3" y="9" width="18" height="11" rx="1.8"/><path d="M3 13h18"/><path d="M12 9v11"/><path d="M12 9C9 9 7.5 7.8 7.5 6.2A2.3 2.3 0 0 1 12 5.5"/><path d="M12 9c3 0 4.5-1.2 4.5-2.8A2.3 2.3 0 0 0 12 5.5"/></>),
  puzzle: (<><path d="M8 4h4.2a1.6 1.6 0 0 1 1.5 2.2 1.6 1.6 0 0 0 1.5 2.2H17a2 2 0 0 1 2 2v2.8a1.6 1.6 0 0 0-2.2-1.5 1.6 1.6 0 0 0-2.2 1.5V17a2 2 0 0 1-2 2h-2.8a1.6 1.6 0 0 0 1.5-2.2 1.6 1.6 0 0 0-1.5-2.2H6a2 2 0 0 1-2-2v-4.2a1.6 1.6 0 0 1 2.2 1.5A1.6 1.6 0 0 0 8.2 8.2 1.6 1.6 0 0 1 8 4z"/></>),
  lightbulb: (<><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6.5 6.5 0 0 0-3.6 11.9c.4.3.6.8.6 1.3V17h6v-.8c0-.5.2-1 .6-1.3A6.5 6.5 0 0 0 12 3z"/></>),
};

export const ICON_NAMES = Object.keys(ICONS);

export interface IconProps {
  name: string;
  size?: number;
  sw?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 19, sw = 1.75, className = "", style }: IconProps) {
  const inner = ICONS[name] || ICONS.dots;
  return (
    <svg
      className={"ic " + className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      {inner}
    </svg>
  );
}

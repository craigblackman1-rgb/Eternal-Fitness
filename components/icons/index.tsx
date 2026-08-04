// EF icon system — 1.8px stroke, rounded caps, brand palette
// Usage: <IconArrowUpRight className="..." style={{ width: 20, height: 20 }} />
// All icons use currentColor — set color via className or style

import type { CSSProperties } from "react";

interface IconProps {
  className?: string;
  style?: CSSProperties;
}

function base(className?: string, style?: CSSProperties) {
  return {
    xmlns: "http://www.w3.org/2000/svg" as const,
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    style,
    "aria-hidden": true as const,
  };
}

// ─── Public-facing brand icons ─────────────────────────────

export function IconArrowUpRight({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M8 24L24 8" />
      <path d="M14 8h10v10" />
    </svg>
  );
}

export function IconAward({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M8 28l2-8-5-4 6-2 3-7 3 7 6 2-5 4 2 8-6-3-6 3z" />
      <circle cx="16" cy="11" r="3" />
    </svg>
  );
}

export function IconHeartHandshake({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M16 27S6 20 6 13a6 6 0 0 1 10-4.5A6 6 0 0 1 26 13c0 7-10 14-10 14z" />
      <path d="M12 13l3 3 5-5" strokeWidth="2.2" />
    </svg>
  );
}

export function IconUser({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <circle cx="16" cy="10" r="5" />
      <path d="M6 27a10 10 0 0 1 20 0" />
    </svg>
  );
}

export function IconShieldCheck({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M16 3l11 4v8c0 8-5 12-11 14C10 27 5 23 5 15V7z" />
      <path d="M11 16l3.5 3.5L21 12" />
    </svg>
  );
}

export function IconRuler({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M6 26L26 6" />
      <path d="M9 23l3-3" />
      <path d="M14 18l3-3" />
      <path d="M19 13l3-3" />
    </svg>
  );
}

export function IconUsers({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <circle cx="12" cy="11" r="4" />
      <path d="M4 26c0-4.4 3.6-8 8-8" />
      <circle cx="21" cy="10" r="3.5" />
      <path d="M28 26c0-5-3-8-7-8" />
    </svg>
  );
}

export function IconAccessibility({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <circle cx="16" cy="6" r="2.5" />
      <path d="M16 10v6l-4 3" />
      <path d="M16 16l4 3" />
      <path d="M8 13h16" />
    </svg>
  );
}

export function IconDumbbell({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <rect x="3" y="13" width="4" height="6" rx="1" />
      <rect x="25" y="13" width="4" height="6" rx="1" />
      <rect x="7" y="14.5" width="18" height="3" rx="1.5" />
      <line x1="9" y1="11" x2="9" y2="21" />
      <line x1="23" y1="11" x2="23" y2="21" />
    </svg>
  );
}

export function IconLeaf({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M24 8C16 8 6 14 4 22c4-3 10-4 16-3-5-3-8-7-8-11 4-1 8 0 12 0z" />
      <path d="M18 14l-6 10" />
    </svg>
  );
}

export function IconCheck({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M7 17l6 6 12-14" />
    </svg>
  );
}

export function IconHeart({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M16 27S4 19.5 4 11.5A7 7 0 0 1 16 7.17 7 7 0 0 1 28 11.5C28 19.5 16 27 16 27z" />
    </svg>
  );
}

export function IconTarget({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <circle cx="16" cy="16" r="10" />
      <circle cx="16" cy="16" r="5" />
      <circle cx="16" cy="16" r="2" />
    </svg>
  );
}

export function IconPhone({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M22 2H10a3 3 0 0 0-3 3v22a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3z" />
      <rect x="10" y="23" width="12" height="2" rx="1" />
      <circle cx="16" cy="5" r="1" />
      <circle cx="16" cy="25" r="1" />
    </svg>
  );
}

export function IconMail({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <rect x="3" y="6" width="26" height="20" rx="3" />
      <path d="M3 10l13 9 13-9" />
    </svg>
  );
}

export function IconMapPin({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M16 28c6-6 10-11 10-16a10 10 0 0 0-20 0c0 5 4 10 10 16z" />
      <circle cx="16" cy="12" r="3" />
    </svg>
  );
}

export function IconMessageCircle({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M26 12a10 10 0 0 1-10 10c-2 0-5-1-7-2l-6 2 3-5a10 10 0 0 1 20-5z" />
    </svg>
  );
}

export function IconSearch({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <circle cx="14" cy="14" r="8" />
      <path d="M20 20l6 6" />
    </svg>
  );
}

export function IconClipboardList({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <rect x="6" y="4" width="20" height="24" rx="2" />
      <path d="M12 2v4" />
      <path d="M20 2v4" />
      <line x1="11" y1="14" x2="21" y2="14" />
      <line x1="11" y1="18" x2="21" y2="18" />
      <line x1="11" y1="22" x2="17" y2="22" />
    </svg>
  );
}

export function IconBarChart3({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <rect x="4" y="18" width="6" height="10" rx="1" />
      <rect x="13" y="10" width="6" height="18" rx="1" />
      <rect x="22" y="4" width="6" height="24" rx="1" />
    </svg>
  );
}

export function IconSparkles({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M16 4l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" />
      <circle cx="8" cy="20" r="1.5" />
      <circle cx="24" cy="22" r="1.5" />
      <circle cx="18" cy="26" r="1" />
    </svg>
  );
}

// ─── Navigation / UI icons ─────────────────────────────────

export function IconChevronLeft({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M20 6L10 16l10 10" />
    </svg>
  );
}

export function IconChevronRight({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M12 6l10 10-10 10" />
    </svg>
  );
}

export function IconChevronDown({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M6 12l10 10 10-10" />
    </svg>
  );
}

export function IconChevronUp({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M6 20l10-10 10 10" />
    </svg>
  );
}

export function IconMenu({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <line x1="6" y1="10" x2="26" y2="10" />
      <line x1="6" y1="16" x2="26" y2="16" />
      <line x1="6" y1="22" x2="26" y2="22" />
    </svg>
  );
}

export function IconX({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M8 8l16 16" />
      <path d="M24 8l-16 16" />
    </svg>
  );
}

export function IconPlus({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <line x1="16" y1="6" x2="16" y2="26" />
      <line x1="6" y1="16" x2="26" y2="16" />
    </svg>
  );
}

export function IconPencil({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M24 4l4 4-16 16-6 2 2-6z" />
      <path d="M20 8l4 4" />
    </svg>
  );
}

export function IconFileText({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M6 4h12l6 6v18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M18 4v6h6" />
      <line x1="10" y1="15" x2="20" y2="15" />
      <line x1="10" y1="19" x2="18" y2="19" />
      <line x1="10" y1="23" x2="16" y2="23" />
    </svg>
  );
}

export function IconTriangleAlert({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M16 4L3 27h26z" />
      <line x1="16" y1="14" x2="16" y2="20" />
      <circle cx="16" cy="23" r="1" />
    </svg>
  );
}

export function IconEye({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M4 16s4-8 12-8 12 8 12 8-4 8-12 8-12-8-12-8z" />
      <circle cx="16" cy="16" r="3.5" />
    </svg>
  );
}

export function IconEyeOff({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M4 16s4-8 12-8 12 8 12 8-4 8-12 8-12-8-12-8z" />
      <circle cx="16" cy="16" r="3.5" />
      <line x1="5" y1="5" x2="27" y2="27" />
    </svg>
  );
}

export function IconPrinter({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <rect x="6" y="12" width="20" height="12" rx="2" />
      <path d="M8 12V6h16v6" />
      <rect x="10" y="18" width="12" height="10" rx="1" />
      <line x1="10" y1="22" x2="22" y2="22" />
    </svg>
  );
}

export function IconTrash2({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M6 8h20" />
      <path d="M10 8V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
      <path d="M12 12v10" />
      <path d="M16 12v10" />
      <path d="M20 12v10" />
      <path d="M8 8l1 18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2l1-18" />
    </svg>
  );
}

export function IconDownload({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M16 4v16" />
      <path d="M8 12l8 8 8-8" />
      <path d="M4 24v3a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export function IconSend({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M4 16L28 4l-6 12 6 12z" />
      <path d="M22 16H10" />
    </svg>
  );
}

export function IconCalendar({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <rect x="4" y="6" width="24" height="22" rx="3" />
      <line x1="4" y1="14" x2="28" y2="14" />
      <line x1="10" y1="2" x2="10" y2="8" />
      <line x1="22" y1="2" x2="22" y2="8" />
      <circle cx="12" cy="19" r="1.5" />
      <circle cx="20" cy="19" r="1.5" />
    </svg>
  );
}

export function IconBot({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <rect x="6" y="8" width="20" height="16" rx="4" />
      <circle cx="12" cy="16" r="2" />
      <circle cx="20" cy="16" r="2" />
      <path d="M10 22l2 2h8l2-2" />
      <path d="M12 8V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3" />
    </svg>
  );
}

export function IconLoader2({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)} {...(className?.includes("animate-spin") ? {} : {})}>
      <path d="M16 4v4" />
      <path d="M16 24v4" opacity=".5" />
      <path d="M4 16h4" />
      <path d="M24 16h4" opacity=".5" />
    </svg>
  );
}

export function IconFileSignature({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M6 4h12l6 6v18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M18 4v6h6" />
      <path d="M8 16l2-2 3 3-2 2z" />
      <path d="M10 18l-2 2" />
    </svg>
  );
}

export function IconUserPlus({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <circle cx="12" cy="11" r="4" />
      <path d="M4 26c0-4.4 3.6-8 8-8" />
      <line x1="22" y1="10" x2="22" y2="20" />
      <line x1="17" y1="15" x2="27" y2="15" />
    </svg>
  );
}

export function IconActivity({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M4 16h5l3-8 4 16 3-8h5" />
    </svg>
  );
}

export function IconCheckCircle({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <circle cx="16" cy="16" r="12" />
      <path d="M10 16l4 4 8-8" />
    </svg>
  );
}

export function IconAlertCircle({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <circle cx="16" cy="16" r="12" />
      <line x1="16" y1="12" x2="16" y2="18" />
      <circle cx="16" cy="22" r="1" />
    </svg>
  );
}

export function IconAlertTriangle({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M16 4L3 27h26z" />
      <line x1="16" y1="14" x2="16" y2="20" />
      <circle cx="16" cy="23" r="1" />
    </svg>
  );
}

export function IconClock({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <circle cx="16" cy="16" r="12" />
      <path d="M16 8v8l6 4" />
    </svg>
  );
}

export function IconZap({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M18 4l-4 10h6l-2 10" />
      <path d="M10 20h8" opacity=".5" />
    </svg>
  );
}

export function IconVideo({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <rect x="2" y="8" width="20" height="16" rx="3" />
      <path d="M22 14l6-4v12l-6-4z" />
    </svg>
  );
}

export function IconExternalLink({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M18 4h10v10" />
      <path d="M28 4L16 16" />
      <path d="M14 10H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

// ─── Social media icons ────────────────────────────────

export function IconFacebook({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <circle cx="16" cy="16" r="12" />
      <path d="M18 28V18h4l1-4h-5v-2c0-1 .5-2 2-2h3V6h-4c-3 0-5 2-5 5v3h-3v4h3v10h4z" />
    </svg>
  );
}

export function IconInstagram({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <rect x="4" y="4" width="24" height="24" rx="6" />
      <circle cx="16" cy="16" r="6" />
      <circle cx="24" cy="8" r="1.5" />
    </svg>
  );
}

export function IconLinkedin({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <rect x="4" y="4" width="24" height="24" rx="4" />
      <path d="M10 14v8" />
      <circle cx="10" cy="10" r="1.5" />
      <path d="M14 14v6h3v-3a2 2 0 0 1 4 0v3h2v-4a4 4 0 0 0-6-3" />
    </svg>
  );
}

export function IconYoutube({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M4 12a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" />
      <path d="M14 11l6 3.5-6 3.5z" />
    </svg>
  );
}

// ─── Utility icons ─────────────────────────────────────

export function IconFilm({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <rect x="2" y="4" width="28" height="24" rx="3" />
      <line x1="2" y1="10" x2="8" y2="10" />
      <line x1="24" y1="10" x2="30" y2="10" />
      <line x1="2" y1="16" x2="8" y2="16" />
      <line x1="24" y1="16" x2="30" y2="16" />
      <line x1="2" y1="22" x2="8" y2="22" />
      <line x1="24" y1="22" x2="30" y2="22" />
      <circle cx="18" cy="16" r="4" />
    </svg>
  );
}

export function IconGripVertical({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <circle cx="14" cy="10" r="1.5" />
      <circle cx="18" cy="10" r="1.5" />
      <circle cx="14" cy="16" r="1.5" />
      <circle cx="18" cy="16" r="1.5" />
      <circle cx="14" cy="22" r="1.5" />
      <circle cx="18" cy="22" r="1.5" />
    </svg>
  );
}

export function IconPanelLeft({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <rect x="3" y="4" width="26" height="24" rx="3" />
      <line x1="11" y1="4" x2="11" y2="28" />
      <line x1="12" y1="10" x2="12" y2="10" />
    </svg>
  );
}

export function IconCircle({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <circle cx="16" cy="16" r="10" />
    </svg>
  );
}

export function IconDot({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <circle cx="16" cy="16" r="3" />
    </svg>
  );
}

export function IconEllipsis({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <circle cx="10" cy="16" r="2" />
      <circle cx="16" cy="16" r="2" />
      <circle cx="22" cy="16" r="2" />
    </svg>
  );
}

export function IconArrowLeft({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <line x1="26" y1="16" x2="6" y2="16" />
      <path d="M14 24l-8-8 8-8" />
    </svg>
  );
}

export function IconArrowRight({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <line x1="6" y1="16" x2="26" y2="16" />
      <path d="M18 8l8 8-8 8" />
    </svg>
  );
}

export function IconClipboardCheck({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <rect x="6" y="4" width="20" height="24" rx="2" />
      <path d="M12 2v4" />
      <path d="M20 2v4" />
      <path d="M11 17l3 3 7-7" />
    </svg>
  );
}

export function IconCheckSquare({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <rect x="4" y="4" width="24" height="24" rx="3" />
      <path d="M10 16l4 4 8-8" />
    </svg>
  );
}

// ─── Additional hub icons ─────────────────────────────

export function IconEdit3({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M12 20h8" />
      <path d="M10 10l-4 10h10z" />
      <path d="M20 6l4 4-8 8-4-4z" />
    </svg>
  );
}

export function IconRefreshCw({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M27 6v8h-8" />
      <path d="M5 15a11 11 0 0 1 18.5-8L27 10" />
      <path d="M5 26v-8h8" />
      <path d="M27 17a11 11 0 0 1-18.5 8L5 22" />
    </svg>
  );
}

export function IconSave({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M4 6a2 2 0 0 1 2-2h14l6 6v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
      <path d="M18 4v8H8V4" />
      <path d="M8 20v-6h14v6" />
    </svg>
  );
}

export function IconCopy({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <rect x="10" y="10" width="14" height="16" rx="2" />
      <path d="M6 18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function IconLayoutDashboard({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="15" y="3" width="8" height="4" rx="2" />
      <rect x="15" y="11" width="8" height="4" rx="2" />
      <rect x="3" y="15" width="8" height="8" rx="2" />
      <rect x="15" y="19" width="8" height="4" rx="2" />
    </svg>
  );
}

export function IconBookText({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M4 6a2 2 0 0 1 2-2h20v20H6a2 2 0 0 1-2-2V6z" />
      <path d="M10 10h10" />
      <path d="M10 14h7" />
      <path d="M10 18h4" />
    </svg>
  );
}

export function IconLogOut({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M16 4h5a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2h-5" />
      <path d="M8 16h12" />
      <path d="M16 10l6 6-6 6" />
    </svg>
  );
}

// ─── Condition-specific icons ──────────────────────────

export function IconBloodPressure({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <circle cx="16" cy="16" r="10" />
      <path d="M16 10v6l4 2" />
      <path d="M8 6c-1.5 1.5-2 3-2 4" />
      <path d="M24 6c1.5 1.5 2 3 2 4" />
    </svg>
  );
}

export function IconLungs({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M16 6v8" />
      <path d="M10 14c-3 0-5 2-5 5s2 5 5 5h2V14z" />
      <path d="M22 14c3 0 5 2 5 5s-2 5-5 5h-2V14z" />
      <path d="M14 14v9" />
      <path d="M18 14v9" />
    </svg>
  );
}

export function IconBone({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <circle cx="8" cy="8" r="3" />
      <circle cx="24" cy="8" r="3" />
      <circle cx="8" cy="24" r="3" />
      <circle cx="24" cy="24" r="3" />
      <path d="M11 8h10M8 11v10M24 11v10M11 24h10" />
    </svg>
  );
}

export function IconDiabetes({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M16 5a5 5 0 0 1 5 5c0 4-5 11-5 11S11 14 11 10a5 5 0 0 1 5-5z" />
      <path d="M13 22h6" />
      <path d="M14 25h4" />
    </svg>
  );
}

export function IconRibbon({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M16 5c2.5 2.5 7 5 7 9a7 7 0 0 1-14 0c0-4 4.5-6.5 7-9z" />
      <path d="M13 21l-3 6" />
      <path d="M19 21l3 6" />
    </svg>
  );
}

export function IconBrain({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M10 20c-3.5 0-5-2.5-5-5a5 5 0 0 1 4-4.9V9a3 3 0 0 1 6 0v.5a5 5 0 0 1 1 9.5" />
      <path d="M22 20c3.5 0 5-2.5 5-5a5 5 0 0 0-4-4.9V9a3 3 0 0 0-6 0v.5" />
      <path d="M10 20h12" />
      <path d="M16 20v5" />
      <path d="M13 25h6" />
    </svg>
  );
}

export function IconUpload({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M16 22V6" />
      <path d="M8 14l8-8 8 8" />
      <path d="M4 24v2a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function IconMove({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <circle cx="16" cy="6" r="2.5" />
      <path d="M12 14l-3 11" />
      <path d="M20 14l3 11" />
      <path d="M10 11h12l-2 8H12z" />
    </svg>
  );
}

export function IconTrendUp({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <polyline points="23 7 13.5 15.5 8.5 10.5 3 17" />
      <polyline points="17 7 23 7 23 13" />
    </svg>
  );
}

export function IconListenAdapt({ className, style }: IconProps) {
  return (
    <svg {...base(className, style)}>
      <path d="M20 12a4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4 4 4 0 0 1 4 4z" />
      <path d="M8 12C8 7.6 11.6 4 16 4s8 3.6 8 8" />
      <path d="M6 12C6 6.5 10.5 2 16 2s10 4.5 10 10" />
      <path d="M16 20v2" />
      <path d="M12 24c0-2.2 1.8-4 4-4s4 1.8 4 4" />
    </svg>
  );
}

import type { ReactNode } from "react";

/** A call-to-action that either opens the consultation dialog (onClick) or links (href). */
export interface CTA {
  label: string;
  onClick?: () => void;
  href?: string;
  /** maps to .ef-btn-* variants */
  variant?: "primary" | "dark" | "outline" | "white" | "ghost-white";
  /** show trailing arrow icon */
  arrow?: boolean;
}

export type Accent = "rose" | "teal" | "warm";
export type SectionBg = "white" | "cream" | "ink" | "teal";
export type IconComponent = (props: { className?: string; style?: React.CSSProperties }) => ReactNode;

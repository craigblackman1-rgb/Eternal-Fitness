import type { ReactNode } from "react";
import type { Accent, IconComponent } from "./types";

interface CalloutProps {
  icon: IconComponent;
  title: string;
  body: ReactNode;
  accent?: Accent;
  className?: string;
}

/** Inline highlight box with an icon badge — for pull-out points within a section. */
export function Callout({ icon: Icon, title, body, accent = "rose", className }: CalloutProps) {
  const accentBgClass = accent === "teal" ? "ds-callout-teal" : "";
  return (
    <div className={`ds-callout ${accentBgClass} ${className ?? ""}`}>
      <div className={`ds-callout-ic ds-callout-ic-${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4>{title}</h4>
        <p>{body}</p>
      </div>
    </div>
  );
}

export default Callout;

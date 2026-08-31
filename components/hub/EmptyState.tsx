import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  cta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

/**
 * Empty state placeholder (CR-EF-039 §5b). Two variants only:
 *  - Nothing exists yet → primary CTA
 *  - Filter excluded it → outline reset
 *
 * Uses the canonical .hub-empty CSS classes from globals.css.
 * Every empty state names what is missing and gives the one action that resolves it.
 */
export function EmptyState({ icon, title, description, cta }: EmptyStateProps) {
  return (
    <div className="hub-empty">
      {icon && (
        <div className="hub-empty-ic">
          {icon}
        </div>
      )}
      <p className="hub-empty-t">{title}</p>
      {description && (
        <p className="hub-empty-d">{description}</p>
      )}
      {cta && (
        cta.href ? (
          <Link href={cta.href}>
            <Button className="btn btn-primary btn-sm">
              {cta.label}
            </Button>
          </Link>
        ) : (
          <Button onClick={cta.onClick} className="btn btn-primary btn-sm">
            {cta.label}
          </Button>
        )
      )}
    </div>
  );
}

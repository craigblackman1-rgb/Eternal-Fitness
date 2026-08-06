import { notFound } from "next/navigation";
import Link from "next/link";
import { RESOURCES } from "@/lib/resources";
import { IconChevronLeft, IconEye } from "@/components/icons";
import CalorieGuideClient from "@/app/portal/(protected)/calorie-guide/CalorieGuideClient";
import ShowdownSoundboardClient from "@/app/portal/(protected)/resources/showdown-soundboard/ShowdownSoundboardClient";

// Each of these client components is self-contained (local state only, no
// fetch/save calls) — safe to render here with a placeholder name so staff
// can see exactly what a client sees, without needing a portal login.
const PREVIEW_COMPONENTS: Record<string, React.ComponentType<{ clientName: string; clientId: string }>> = {
  "calorie-calculator": CalorieGuideClient,
  "showdown-soundboard": ShowdownSoundboardClient,
};

export default function ResourcePreviewPage({ params }: { params: { key: string } }) {
  const resource = RESOURCES.find((r) => r.key === params.key);
  const Component = PREVIEW_COMPONENTS[params.key];
  if (!resource || !Component) notFound();

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Link
          href="/hub/resources"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconChevronLeft className="h-3.5 w-3.5" />
          Back to Portal Resources
        </Link>
        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--status-primary-border)] bg-[var(--status-primary-bg)] px-4 py-3">
          <IconEye className="h-4 w-4 mt-0.5 shrink-0 text-rose" />
          <p className="text-[13px] text-[var(--color-body)] leading-relaxed">
            <strong className="text-foreground">Staff preview</strong> — this is exactly what a
            client sees at their end, shown here with a sample name. Nothing typed in below is
            saved or sent anywhere.
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--hub-border)] bg-white p-6 sm:p-8">
        <Component clientName="Sample Client" clientId="preview" />
      </div>
    </div>
  );
}

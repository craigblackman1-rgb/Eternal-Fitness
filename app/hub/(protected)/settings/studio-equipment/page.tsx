import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { EquipmentManager } from "./EquipmentManager";
import { HubPageHeader } from "@/components/hub";
import type { StudioEquipment } from "@/types";

export default async function StudioEquipmentPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/hub/login");

  const { data: equipment } = await supabase
    .from("studio_equipment")
    .select("*")
    .order("sort_order", { ascending: true });

  const initialEquipment = (equipment ?? []) as StudioEquipment[];
  const activeCount = initialEquipment.filter((e) => e.active).length;

  return (
    <div>
      <HubPageHeader
        title="Studio equipment"
        subtitle="The Plan Agent can only programme from items listed here. Toggle off anything out of service."
        className="mb-5"
        actions={
          <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]">
            {activeCount} active
          </span>
        }
      />
      <EquipmentManager initialEquipment={initialEquipment} />
    </div>
  );
}

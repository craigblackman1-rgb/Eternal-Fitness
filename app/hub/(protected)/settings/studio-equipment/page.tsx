import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { EquipmentManager } from "./EquipmentManager";
import { BandManager } from "./BandManager";
import { HubPageHeader } from "@/components/hub";
import { getPool } from "@/lib/pg-client";
import type { StudioEquipment } from "@/types";
import type { Band, BandSet } from "@/lib/bands";

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

  // CR-EF-014 + CR-EF-116: fetch band sets and the studio set's bands.
  const pool = getPool();
  const setsRes = await pool.query(`SELECT * FROM band_sets ORDER BY owner_type ASC, name ASC`);
  const bandSets: BandSet[] = setsRes.rows;

  // Default to the EF Studio set
  const studioSetId = "00000000-0000-0000-0000-000000000001";
  const bandsRes = await pool.query(
    `SELECT * FROM bands WHERE band_set_id = $1 ORDER BY sort_order ASC`,
    [studioSetId],
  );
  const initialBands: Band[] = bandsRes.rows;

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
      <div className="mt-6">
        <BandManager
          initialBandSets={bandSets}
          initialBands={initialBands}
          initialSelectedSetId={studioSetId}
        />
      </div>
    </div>
  );
}

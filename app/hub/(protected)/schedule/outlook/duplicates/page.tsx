import { HubPageHeader, OutlookReconciliationTabs } from "@/components/hub";
import { OutlookDuplicatesQueue } from "./OutlookDuplicatesQueue";

// CR-EF-028 — Outlook duplicate-event reconciliation queue.
export default function OutlookDuplicatesPage() {
  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Possible duplicate events"
        subtitle="Sessions that are about to push their own Outlook event — but you already keep a same-day, name-matching event of your own. Until you resolve a row, that session's calendar-sync is paused so nothing changes silently."
      />
      <OutlookReconciliationTabs active="duplicates" />
      <OutlookDuplicatesQueue />
    </div>
  );
}

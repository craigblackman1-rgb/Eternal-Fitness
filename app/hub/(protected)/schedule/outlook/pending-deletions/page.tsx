import { HubPageHeader } from "@/components/hub";
import { OutlookReconciliationTabs } from "@/components/hub/OutlookReconciliationTabs";
import { CalendarSyncPendingQueue } from "./CalendarSyncPendingQueue";

// Calendar Sync — Pending Actions approval queue.
// Safety-review queue for all calendar-event mutations (create, update, delete)
// gated by the confirm-before-sync toggle.
//
// It was NOT reachable: a grep for inbound links found none anywhere in the
// app -- not the sidebar, not the Outlook tab row -- so the only way here was
// to type the URL. 17 actions sat unapproved from 28 Aug to 5 Sep as a result,
// with Outlook quietly drifting from the hub. It now carries the same tab row
// as the other three Outlook queues.
export default function PendingDeletionsPage() {
  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Calendar Sync — Pending Actions"
        subtitle="When confirm-before-sync is enabled, every calendar change (create, update, delete) stops here first. Nothing reaches Outlook until you approve it below."
      />
      <OutlookReconciliationTabs active="pending" />
      <CalendarSyncPendingQueue />
    </div>
  );
}

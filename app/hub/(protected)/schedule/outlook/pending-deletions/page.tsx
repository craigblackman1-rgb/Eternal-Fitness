import { HubPageHeader } from "@/components/hub";
import { CalendarSyncPendingQueue } from "./CalendarSyncPendingQueue";

// Calendar Sync — Pending Actions approval queue.
// Safety-review queue for all calendar-event mutations (create, update, delete)
// gated by the confirm-before-sync toggle. Reachable via breadcrumb/quick-actions.
export default function PendingDeletionsPage() {
  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Calendar Sync — Pending Actions"
        subtitle="When confirm-before-sync is enabled, every calendar change (create, update, delete) stops here first. Nothing reaches Outlook until you approve it below."
      />
      <CalendarSyncPendingQueue />
    </div>
  );
}

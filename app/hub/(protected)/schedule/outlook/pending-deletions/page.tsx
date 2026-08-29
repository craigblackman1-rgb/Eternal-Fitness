import { HubPageHeader } from "@/components/hub";
import { CalendarSyncPendingQueue } from "./CalendarSyncPendingQueue";

// Calendar Sync — Pending Deletions approval queue.
// Safety-review queue for calendar-event deletions gated after the 2026-08-28
// incident. Reachable via breadcrumb/quick-actions, NOT a primary nav item.
export default function PendingDeletionsPage() {
  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Calendar Sync — Pending Deletions"
        subtitle="On 28 Aug 2026 a background sync bug was found silently deleting real Outlook events for sessions that had already happened. It's fixed — but as a safety measure, every calendar-event deletion now stops here first. Nothing is removed from Outlook until you approve it below."
      />
      <CalendarSyncPendingQueue />
    </div>
  );
}

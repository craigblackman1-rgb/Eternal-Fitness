import { HubPageHeader, OutlookReconciliationTabs } from "@/components/hub";
import { UnassignedOutlookSessions } from "./UnassignedOutlookSessions";

// CR-EF-111 — bulk-assign page for Outlook-booked sessions with no workout.
export default function UnassignedOutlookPage() {
  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Unassigned Outlook sessions"
        subtitle="These sessions were auto-created from Outlook bookings but have no workout assigned yet. Select sessions and assign a template in bulk."
      />
      <OutlookReconciliationTabs active="unassigned" />
      <UnassignedOutlookSessions />
    </div>
  );
}

import { HubPageHeader } from "@/components/hub";
import { OutlookBookingsQueue } from "./OutlookBookingsQueue";

// CR-EF-050 — Outlook Bookings reconciliation queue.
export default function OutlookBookingsPage() {
  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Outlook booking reconciliations"
        subtitle="Clients book personal-training sessions through the Microsoft Bookings form. Those land in your Outlook calendar but the app doesn't know about them yet — confirm which appointment maps to which client (and which block) to turn each one into a real session."
      />
      <OutlookBookingsQueue />
    </div>
  );
}

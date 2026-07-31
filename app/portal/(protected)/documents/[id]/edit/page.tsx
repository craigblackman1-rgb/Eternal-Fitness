import { redirect } from "next/navigation";

// PAR-Q / feedback fill-in is now handled inline on the same single document
// page (matching the hub-generated email/copied link), so this route just
// points there. Kept as a redirect (not deleted) since it may still be
// linked from emails, the portal dashboard, or bookmarks.
export default function PortalDocumentEditRedirect({ params }: { params: { id: string } }) {
  redirect(`/portal/documents/${params.id}`);
}

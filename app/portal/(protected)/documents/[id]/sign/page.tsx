import { redirect } from "next/navigation";

// The sign flow is now the same single page as the document view — the exact
// same renderer used by the hub-generated email/copied link — so this route
// just points there. Kept as a redirect (not deleted) since it may still be
// linked from emails, the portal dashboard, or bookmarks.
export default function PortalDocumentSignRedirect({ params }: { params: { id: string } }) {
  redirect(`/portal/documents/${params.id}`);
}

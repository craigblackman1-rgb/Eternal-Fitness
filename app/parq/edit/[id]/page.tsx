import { notFound } from "next/navigation";
import ParqEditClient from "./ParqEditClient";
import { createAdminClient } from "@/lib/supabase-admin";
import { verifyParqLink, PARQ_LINK_TTL_DAYS } from "@/lib/parq-link";

function ExpiredNotice({ expired }: { expired: boolean }) {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 460, textAlign: "center", fontFamily: "'DM Sans', Helvetica, Arial, sans-serif" }}>
        <div
          style={{
            width: 56, height: 56, borderRadius: "50%", background: "#C1839F22", color: "#C1839F",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px",
            fontSize: 26, fontWeight: 700,
          }}
        >
          !
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#3C3C3C", margin: "0 0 10px" }}>
          {expired ? "This link has expired" : "This link isn't valid"}
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#525A61", margin: 0 }}>
          {expired
            ? `For your security, PAR-Q links stay active for ${PARQ_LINK_TTL_DAYS} days. Please ask Esther to send you a fresh link and she'll get a new one over to you.`
            : "This PAR-Q link is incomplete or has been changed. Please ask Esther to send you a new link."}
        </p>
        <p style={{ fontSize: 13, color: "#8A8790", marginTop: 20 }}>Eternal Fitness · Worthing</p>
      </div>
    </div>
  );
}

export default async function ParqEditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { exp?: string; sig?: string };
}) {
  // Client-facing link: require a valid, unexpired signature. This is what makes
  // the 7-day expiry real — a bare /parq/edit/<id> with no signature is rejected.
  const check = verifyParqLink(params.id, searchParams.exp, searchParams.sig);
  if (!check.ok) {
    return <ExpiredNotice expired={check.reason === "expired"} />;
  }

  // The client isn't logged in, so load their row with the service-role client,
  // scoped to the single id in the (now verified) link.
  const supabase = createAdminClient();
  const { data: parq } = await supabase
    .from("signed_parq")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!parq) notFound();

  // The save action re-verifies this same signature server-side (G4, 2026-08-20)
  // -- the page render check above only gated whether the form was SHOWN, not
  // whether a save was accepted, so the client must carry exp/sig through to POST.
  return <ParqEditClient parq={parq} linkExp={Number(searchParams.exp)} linkSig={searchParams.sig!} />;
}

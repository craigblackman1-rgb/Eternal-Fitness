import Link from "next/link";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createPortalDataClient } from "@/lib/portal-data";
import { createAdminClient } from "@/lib/supabase-admin";
import { HubCard, HubCardHeader } from "@/components/hub";
import { IconUser, IconAccessibility, IconFileText, IconMail, IconClipboardCheck } from "@/components/icons";

type ClientDetail = {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  gp_surgery: string | null;
};

export default async function PortalAccountPage() {
  const session = await getPortalSessionFromCookies();
  if (!session) return null;

  const data = createPortalDataClient(session.clientId);
  const client = await data.getClient();

  // phone/address/emergency-contact/GP fields don't live on `clients` — they're
  // captured on the client's PAR-Q, so pull the latest submission (same pattern
  // used by app/hub/(protected)/clients/[id]/parq/page.tsx).
  const admin = createAdminClient();
  const { data: latestParq } = await admin
    .from("signed_parq")
    .select("email, phone, address, emergency_contact_name, emergency_contact_phone, gp_surgery")
    .eq("client_id", session.clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const details: ClientDetail = {
    name: client?.name ?? "",
    email: client?.email ?? latestParq?.email ?? null,
    phone: latestParq?.phone ?? null,
    address: latestParq?.address ?? null,
    emergency_contact_name: latestParq?.emergency_contact_name ?? null,
    emergency_contact_phone: latestParq?.emergency_contact_phone ?? null,
    gp_surgery: latestParq?.gp_surgery ?? null,
  };

  return (
    <div className="space-y-8">
      <section aria-labelledby="account-heading">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground mb-2">Your account</p>
        <h1 id="account-heading" className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          How this client area looks, how Esther gets in touch, and what is held about you.
          Everything here is yours to change.
        </p>
      </section>

      {/* Display settings */}
      <HubCard>
        <HubCardHeader
          icon={<IconAccessibility className="w-4 h-4" />}
          title="How this looks"
          color="teal"
        />
        <p className="text-sm text-muted-foreground mb-6">
          These settings are remembered on this device, and apply to every page in your client area including documents you print.
        </p>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Text size</p>
            <p className="text-sm text-muted-foreground mb-3">Larger text also makes buttons, spacing and forms bigger — not just the words.</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Normal", note: "100%", value: "0" },
                { label: "Large", note: "115%", value: "1" },
                { label: "Larger", note: "130%", value: "2" },
                { label: "Largest", note: "150%", value: "3" },
              ].map((opt) => (
                <label key={opt.value} className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-medium cursor-pointer hover:bg-accent">
                  <input type="radio" name="textsize" value={opt.value} defaultChecked={opt.value === "0"} className="h-4 w-4 text-teal" />
                  {opt.label} <span className="text-muted-foreground font-normal">{opt.note}</span>
                </label>
              ))}
            </div>

            <div className="mt-4 p-4 rounded-lg bg-off-white border border-border/60">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground mb-2">Preview — currently Normal</p>
              <p className="text-sm font-semibold text-foreground">Give 24 hours&rsquo; notice to move a session and there is no charge.</p>
              <p className="text-sm text-muted-foreground mt-1">If the reason is treatment, illness or a hospital appointment, there is never a charge and you do not need to give a reason.</p>
            </div>
          </div>

          {[
            { title: "High contrast", desc: "Removes the warm cream backgrounds and soft shadows, and makes every line and border black. Useful with low vision, glare, or a bright room." },
            { title: "Reduce motion", desc: "Stops buttons lifting and bars sliding. Already on automatically if your device is set to reduce motion." },
          ].map((item) => (
            <div key={item.title} className="flex items-start justify-between gap-4 py-4 border-t border-border/60">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
              </div>
              <button type="button" className="shrink-0 inline-flex min-h-11 items-center rounded-full border border-input px-4 text-sm font-medium hover:bg-accent">
                Turn on
              </button>
            </div>
          ))}

          <div className="flex items-start justify-between gap-4 py-4 border-t border-border/60">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Back to normal</h3>
              <p className="text-sm text-muted-foreground mt-1">Puts the text size back to 100%. Contrast and motion stay as you set them.</p>
            </div>
            <button type="button" className="shrink-0 inline-flex min-h-11 items-center rounded-full border border-input px-4 text-sm font-medium hover:bg-accent">
              Reset text size
            </button>
          </div>
        </div>
      </HubCard>

      {/* Document preferences */}
      <HubCard>
        <HubCardHeader
          icon={<IconFileText className="w-4 h-4" />}
          title="How you like your documents"
          color="slate"
        />
        <p className="text-sm text-muted-foreground mb-6">Online is not the only option, and choosing paper does not mean you lose access here.</p>

        <div>
          <p className="text-sm font-semibold text-foreground mb-3">Send new documents to me</p>
          <div className="space-y-3">
            {[
              { value: "online", label: "Here in the client area, with an email to tell me", note: "What you have now" },
              { value: "large-print", label: "Here, and printed in large print at my next session" },
              { value: "post", label: "By post, in large print", note: "Signed copies come back by post too" },
              { value: "in-person", label: "Go through them with me in a session", note: "Esther reads them with you and nothing is signed alone" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-start gap-3 cursor-pointer py-2">
                <input type="radio" name="docpref" value={opt.value} defaultChecked={opt.value === "online"} className="mt-0.5 h-4 w-4 text-teal shrink-0" />
                <span className="text-sm text-foreground">
                  {opt.label}
                  {opt.note && <span className="block text-xs text-muted-foreground mt-0.5">{opt.note}</span>}
                </span>
              </label>
            ))}
          </div>
        </div>
      </HubCard>

      {/* Your details */}
      <HubCard>
        <HubCardHeader
          icon={<IconUser className="w-4 h-4" />}
          title="Your details"
          color="navy"
          action={
            <button type="button" className="inline-flex min-h-10 items-center rounded-full border border-input px-4 text-sm font-medium hover:bg-accent">
              Change details
            </button>
          }
          divider
        />
        <div className="divide-y divide-border/60">
          {[
            { k: "Name", v: details.name || "—" },
            { k: "Email", v: details.email || "—" },
            { k: "Mobile", v: details.phone || "—" },
            { k: "Address", v: details.address || "—" },
            { k: "Emergency contact", v: details.emergency_contact_name ? `${details.emergency_contact_name} · ${details.emergency_contact_phone || ""}` : "—" },
            { k: "GP surgery", v: details.gp_surgery || "—" },
          ].map((row) => (
            <div key={row.k} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4">
              <span className="w-36 shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{row.k}</span>
              <span className="text-sm font-semibold text-foreground">{row.v}</span>
            </div>
          ))}
        </div>
      </HubCard>

      {/* Contact preferences */}
      <HubCard>
        <HubCardHeader
          icon={<IconMail className="w-4 h-4" />}
          title="How Esther gets in touch"
          color="amber"
        />
        <p className="text-sm text-muted-foreground mb-6">Only about your training — never marketing, and never passed to anyone else.</p>

        <div>
          <p className="text-sm font-semibold text-foreground mb-3">You are happy to be contacted by</p>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "email", label: "Email", defaultChecked: true },
              { value: "text", label: "Text message", defaultChecked: true },
              { value: "phone", label: "Phone call" },
              { value: "post", label: "Post" },
            ].map((opt) => (
              <label key={opt.value} className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-sm font-medium cursor-pointer hover:bg-accent">
                <input type="checkbox" name="contact" value={opt.value} defaultChecked={opt.defaultChecked} className="h-4 w-4 text-teal" />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </HubCard>

      {/* Your information */}
      <HubCard>
        <HubCardHeader
          icon={<IconClipboardCheck className="w-4 h-4" />}
          title="Your information"
          color="rose"
        />
        <p className="text-sm text-muted-foreground mb-6">Your rights under UK data protection law, as plain buttons rather than a paragraph you have to decode.</p>

        <div className="space-y-0 divide-y divide-border/60">
          {[
            { title: "Get a copy of everything", desc: "Every document, questionnaire answer and session note held about you, as one download." },
            { title: "Correct something", desc: "If anything held about you is wrong or out of date, tell Esther and it is changed." },
            { title: "Close your account", desc: "Your access ends and your records are deleted, except what professional insurance requires Esther to keep for seven years." },
          ].map((item) => (
            <div key={item.title} className="flex items-start justify-between gap-4 py-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
              </div>
              <button type="button" className="shrink-0 inline-flex min-h-11 items-center rounded-full border border-input px-4 text-sm font-medium hover:bg-accent">
                {item.title === "Get a copy of everything" ? "Request copy" : item.title === "Correct something" ? "Ask for a change" : "Close account"}
              </button>
            </div>
          ))}
        </div>
      </HubCard>

      {/* Accessibility help */}
      <div className="rounded-2xl border border-teal/30 bg-teal/5 p-5">
        <div className="flex gap-3">
          <div className="w-[30px] h-[30px] rounded-lg bg-teal/10 text-teal flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.5" /></svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Something here still hard to use?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tell Esther what is getting in the way — it gets fixed, and it gets fixed for everyone. Call{" "}
              <a href="tel:07517658128" className="text-teal font-medium hover:underline">07517 658 128</a>{" "}
              or email{" "}
              <a href="mailto:esther.fair@eternal-fitness.co.uk" className="text-teal font-medium hover:underline">esther.fair@eternal-fitness.co.uk</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

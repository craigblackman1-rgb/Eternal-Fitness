import type { Metadata } from "next";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createPortalDataClient } from "@/lib/portal-data";
import ShowdownSoundboardClient from "./ShowdownSoundboardClient";

export const metadata: Metadata = {
  title: "Showdown Soundboard — Eternal Fitness client area",
  description:
    "Position-cue audio tool with tones and background ambience for table tennis training.",
};

export default async function ShowdownSoundboardPage() {
  const session = await getPortalSessionFromCookies();
  if (!session) return null;

  const data = createPortalDataClient(session.clientId);
  const client = await data.getClient();

  return (
    <ShowdownSoundboardClient
      clientName={client?.name ?? "Your account"}
    />
  );
}

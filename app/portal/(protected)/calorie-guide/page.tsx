import type { Metadata } from "next";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createPortalDataClient } from "@/lib/portal-data";
import CalorieGuideClient from "./CalorieGuideClient";

export const metadata: Metadata = {
  title: "Your daily calorie guide \u2014 Eternal Fitness client area",
  description:
    "A starting estimate of how much you need in a day, and how you might split it between protein, carbohydrate and fat.",
};

export default async function CalorieGuidePage() {
  const session = await getPortalSessionFromCookies();
  if (!session) return null;

  const data = createPortalDataClient(session.clientId);
  const client = await data.getClient();

  return (
    <CalorieGuideClient
      clientName={client?.name ?? "Your account"}
      clientId={session.clientId}
    />
  );
}

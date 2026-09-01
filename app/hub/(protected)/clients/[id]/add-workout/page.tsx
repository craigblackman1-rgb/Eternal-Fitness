import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { AddWorkoutClient } from "./AddWorkoutClient";

export default async function AddWorkoutPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, client_number, delivery_mode, equipment, package_type, profile, sessions_purchased")
    .eq("client_number", parseInt(params.id))
    .single();

  if (!client) notFound();

  return (
    <AddWorkoutClient
      clientNumber={client.client_number}
      clientName={client.name}
      clientId={client.id}
      deliveryMode={client.delivery_mode}
      equipment={client.equipment}
      packageType={client.package_type}
    />
  );
}

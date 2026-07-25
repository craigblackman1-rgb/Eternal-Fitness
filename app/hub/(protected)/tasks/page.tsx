import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { HubPageHeader } from "@/components/hub";
import { TasksManager } from "./TasksManager";
import type { Task } from "@/types";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function TasksPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/hub/login");

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <HubPageHeader
        title="Tasks"
        subtitle="Esther and Craig's shared to-do list — create tasks and assign them to whoever owns the next step."
        className="mb-6"
      />
      <TasksManager initialTasks={(tasks ?? []) as Task[]} />
    </div>
  );
}

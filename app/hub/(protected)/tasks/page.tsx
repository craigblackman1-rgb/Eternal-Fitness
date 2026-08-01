import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { HubPageHeader } from "@/components/hub";
import { TasksManager } from "./TasksManager";
import type { Task, TaskBucket } from "@/types";

export const metadata = {
  robots: { index: false, follow: false },
};

interface ClientOption {
  id: string;
  name: string;
}

export default async function TasksPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/hub/login");

  const [{ data: tasks }, { data: buckets }, { data: clients }] = await Promise.all([
    supabase.from("tasks").select("*, clients(name)").order("created_at", { ascending: false }),
    supabase.from("task_buckets").select("*").order("name", { ascending: true }),
    supabase.from("clients").select("id, name").order("name", { ascending: true }),
  ]);

  const tasksWithClientName = (tasks ?? []).map((task: Record<string, unknown>) => ({
    ...task,
    client_name: (task.clients as { name?: string } | null)?.name ?? null,
  })) as Task[];

  return (
    <div>
      <HubPageHeader
        title="Tasks"
        subtitle="Esther and Craig's shared to-do list — create tasks and assign them to whoever owns the next step."
        className="mb-6"
      />
      <TasksManager
        initialTasks={tasksWithClientName}
        initialBuckets={(buckets ?? []) as TaskBucket[]}
        currentUserName={user.name ?? null}
        clients={(clients ?? []) as ClientOption[]}
      />
    </div>
  );
}

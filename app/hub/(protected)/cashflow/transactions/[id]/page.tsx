import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { HubPageHeader, HubCard, EmptyState, StatusBadge } from "@/components/hub";
import { IconChevronLeft } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { TransactionTable } from "./transaction-table";

interface ImportDetailPageProps {
  params: { id: string };
}

export default async function ImportDetailPage({ params }: ImportDetailPageProps) {
  const supabase = createClient();
  const { id } = await Promise.resolve(params);

  const { data: imp } = await supabase
    .from("bank_statement_imports")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!imp) notFound();

  const { data: transactions } = await supabase
    .from("bank_transactions")
    .select("*")
    .eq("import_id", id)
    .order("txn_date", { ascending: true });

  const list = transactions ?? [];

  return (
    <div className="space-y-6">
      <HubPageHeader
        title={imp.source_file_name}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusBadge status={imp.status} />
            <span className="text-[var(--hub-muted)]">
              {list.length} {list.length === 1 ? "transaction" : "transactions"}
            </span>
            <span className="text-[var(--hub-muted)]">
              Imported{" "}
              {new Date(imp.uploaded_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </span>
        }
        actions={
          <Link href="/hub/cashflow/transactions">
            <Button variant="outline" size="sm" className="rounded-lg gap-1.5">
              <IconChevronLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        }
      />

      {list.length === 0 ? (
        <HubCard>
          <EmptyState title="No transactions" description="This import has no transactions." />
        </HubCard>
      ) : (
        <HubCard padded={false}>
          <TransactionTable transactions={list} />
        </HubCard>
      )}
    </div>
  );
}

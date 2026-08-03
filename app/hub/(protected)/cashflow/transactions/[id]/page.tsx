import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { HubPageHeader, HubCard, EmptyState, StatusBadge } from "@/components/hub";
import { IconChevronLeft } from "@/components/icons";
import { Button } from "@/components/ui/button";

interface ImportDetailPageProps {
  params: { id: string };
}

function formatAmount(amount: number, currency: string): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(abs);
  return amount < 0 ? `-${formatted}` : `+${formatted}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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
          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--hub-hover)] text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--hub-muted)]">
                  <th className="px-5 py-2.5 text-left">Date</th>
                  <th className="px-5 py-2.5 text-left">Description</th>
                  <th className="px-5 py-2.5 text-right">Amount</th>
                  <th className="px-5 py-2.5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {list.map((txn) => (
                  <tr
                    key={txn.id}
                    className="border-b border-[var(--hub-border)] text-sm hover:bg-[var(--hub-hover)]/50 transition-colors"
                  >
                    <td className="px-5 py-2.5 whitespace-nowrap text-[var(--hub-muted)]">
                      {formatDate(txn.txn_date)}
                    </td>
                    <td className="px-5 py-2.5">{txn.description}</td>
                    <td
                      className={`px-5 py-2.5 text-right tabular-nums font-medium ${
                        Number(txn.amount) < 0
                          ? "text-[var(--status-danger)]"
                          : "text-[var(--status-success-text)]"
                      }`}
                    >
                      {formatAmount(Number(txn.amount), txn.currency)}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-[var(--hub-muted)]">
                      {txn.balance != null
                        ? new Intl.NumberFormat("en-GB", {
                            style: "currency",
                            currency: txn.currency,
                          }).format(Number(txn.balance))
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HubCard>
      )}
    </div>
  );
}

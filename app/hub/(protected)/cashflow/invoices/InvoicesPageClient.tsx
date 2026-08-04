"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { HubPageHeader } from "@/components/hub";
import { Toolbar, toolbarSelectClasses } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@/components/icons";
import { InvoicesTable, type InvoiceRow } from "./invoices-table";
import { NewInvoiceDrawer } from "./NewInvoiceDrawer";

interface InvoicesPageClientProps {
  invoices: InvoiceRow[];
  outstandingTotal: number;
}

export function InvoicesPageClient({ invoices, outstandingTotal }: InvoicesPageClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter && inv.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const num = inv.invoice_number.toLowerCase();
        const name = (inv.clients?.name ?? "").toLowerCase();
        if (!num.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, search, statusFilter]);

  const countText = `${filtered.length} invoice${filtered.length !== 1 ? "s" : ""} · ${fmt(outstandingTotal)} outstanding`;

  return (
    <div className="space-y-[20px]">
      <HubPageHeader
        title="Invoices"
        subtitle="Every invoice, its line items and its status — draft through paid."
        actions={
          <Button
            className="rounded-lg gap-1.5 bg-rose hover:bg-rose/90 text-white"
            onClick={() => setDrawerOpen(true)}
          >
            <IconPlus className="w-4 h-4" />
            New invoice
          </Button>
        }
      />

      <Toolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search invoices..."
        count={filtered.length > 0 ? `${filtered.length} invoice${filtered.length !== 1 ? "s" : ""} · ${fmt(outstandingTotal)} outstanding` : undefined}
      >
        <select
          className={toolbarSelectClasses}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="void">Void</option>
        </select>
      </Toolbar>

      {filtered.length > 0 ? (
        <div className="bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.07)] overflow-hidden">
          <InvoicesTable data={filtered} />
        </div>
      ) : (
        <div className="bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.07)] py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {invoices.length === 0
              ? "No invoices yet — create your first one above"
              : "No invoices match your search"}
          </p>
        </div>
      )}

      <NewInvoiceDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={() => {
          setDrawerOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function fmt(n: number) {
  return `£${n.toFixed(2)}`;
}

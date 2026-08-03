"use client";

import Link from "next/link";
import { HubTable, type HubColumn } from "@/components/hub/HubTable";
import { TokenPill } from "@/components/hub/StatusBadge";
import { EmptyState } from "@/components/hub/EmptyState";
import { IconEye, IconFileSignature, IconMail, IconPhone } from "@/components/icons";
import { Button } from "@/components/ui/button";

interface AgreementRow {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  parq_completed: string;
  medical_clearance: string;
  signed_at: string;
  client_number: number | null;
}

function fmt(v: string) {
  return new Date(v).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const columns: HubColumn<AgreementRow>[] = [
  {
    key: "client_name",
    header: "Client",
    sortable: true,
    render: (row) => (
      <span className="font-medium text-foreground">{row.client_name}</span>
    ),
  },
  {
    key: "contact",
    header: "Contact",
    render: (row) => (
      <div className="text-muted-foreground text-xs space-y-0.5">
        {row.client_email && (
          <div className="flex items-center gap-1">
            <IconMail className="w-3 h-3" />
            {row.client_email}
          </div>
        )}
        {row.client_phone && (
          <div className="flex items-center gap-1">
            <IconPhone className="w-3 h-3" />
            {row.client_phone}
          </div>
        )}
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <div className="flex flex-wrap gap-1">
        {row.parq_completed === "yes" && (
          <TokenPill token="success" label="PAR-Q filed" />
        )}
        {row.parq_completed === "no" && (
          <TokenPill token="warning" label="PAR-Q missing" />
        )}
        {row.medical_clearance === "yes" && (
          <TokenPill token="success" label="Clearance filed" />
        )}
        {row.medical_clearance === "na" && (
          <TokenPill token="neutral" label="No clearance needed" />
        )}
      </div>
    ),
  },
  {
    key: "signed_at",
    header: "Signed",
    sortable: true,
    className: "text-muted-foreground whitespace-nowrap",
    render: (row) => <span className="text-xs">{fmt(row.signed_at)}</span>,
  },
  {
    key: "actions",
    header: "",
    render: (row) => (
      <div className="flex items-center gap-2 whitespace-nowrap">
        {row.client_number && (
          <Link
            href={`/hub/clients/${row.client_number}?tab=profile-compliance`}
            className="text-rose font-medium hover:underline text-xs"
          >
            Profile
          </Link>
        )}
        <Link href={`/hub/agreements/${row.id}`}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg hover:bg-rose/10 hover:text-rose"
          >
            <IconEye className="w-4 h-4" />
            <span className="sr-only">View agreement</span>
          </Button>
        </Link>
      </div>
    ),
    className: "text-right",
    headerClassName: "w-0",
  },
];

interface AgreementsTableProps {
  data: AgreementRow[];
}

export function AgreementsTable({ data }: AgreementsTableProps) {
  return (
    <HubTable
      data={data}
      columns={columns}
      getRowHref={(row) => `/hub/agreements/${row.id}`}
      searchPlaceholder="Search agreements by client name..."
      searchKeys={["client_name"]}
      emptyState={
        <EmptyState
          icon={<IconFileSignature className="w-7 h-7" />}
          title="No signed agreements yet"
          description={
            <>
              Agreements will appear here once clients sign at{" "}
              <code className="text-rose bg-rose/5 px-1.5 py-0.5 rounded">
                /agreement
              </code>
            </>
          }
        />
      }
      countLabel="agreement"
    />
  );
}

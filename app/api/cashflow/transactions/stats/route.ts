import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: imports } = await supabase
    .from("bank_statement_imports")
    .select("id,source_file_name,uploaded_at,status,row_count")
    .order("created_at", { ascending: false });

  const { data: transactions } = await supabase
    .from("bank_transactions")
    .select("import_id,income_category,expense_category,is_excluded");

  const txnByImport = new Map<string, { total: number; uncategorised: number; categorised: number; excluded: number }>();

  for (const t of (transactions ?? [])) {
    const entry = txnByImport.get(t.import_id) ?? { total: 0, uncategorised: 0, categorised: 0, excluded: 0 };
    entry.total++;
    if (t.is_excluded) {
      entry.excluded++;
    } else if (!t.income_category && !t.expense_category) {
      entry.uncategorised++;
    } else {
      entry.categorised++;
    }
    txnByImport.set(t.import_id, entry);
  }

  const importStats = (imports ?? []).map((imp) => {
    const counts = txnByImport.get(imp.id) ?? { total: 0, uncategorised: 0, categorised: 0, excluded: 0 };
    return { ...imp, ...counts };
  });

  const lastImport = importStats.length > 0 ? importStats[0] : null;

  return NextResponse.json({ imports: importStats, lastImport });
}

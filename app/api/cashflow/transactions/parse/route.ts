import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { parseMonzoStyleCsv, ParseError } from "@/lib/bank-statement-parser";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File must be 5 MB or less" }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith(".csv")) {
    return NextResponse.json({ error: "Only CSV files are accepted" }, { status: 400 });
  }

  const csvText = await file.text();

  try {
    const transactions = parseMonzoStyleCsv(csvText);

    if (transactions.length === 0) {
      return NextResponse.json({ error: "No transactions found in the file" }, { status: 400 });
    }

    return NextResponse.json({
      fileName: file.name,
      rowCount: transactions.length,
      transactions,
    });
  } catch (e) {
    if (e instanceof ParseError) {
      return NextResponse.json({ error: e.message, parseError: true }, { status: 422 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to parse CSV" },
      { status: 500 },
    );
  }
}

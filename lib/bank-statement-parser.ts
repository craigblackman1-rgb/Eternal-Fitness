export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  balance: number;
  currency: string;
  raw_type: string;
  raw: Record<string, string>;
}

/**
 * Parse a Monzo-style CSV export (stand-in for HSBC).
 *
 * Expected header (Monzo format):
 *   Transaction ID, Date, Time, Type, Name, Emoji, Category, Amount,
 *   Currency, Local amount, Local currency, Notes and #tags, Address,
 *   Receipt, Description, Category split, Money Out, Money In, Balance,
 *   Balance currency
 *
 * Date: DD/MM/YYYY.  Amount: signed (negative = money out).
 *
 * Swap this implementation for `parseHsbcCsv()` when a real HSBC export
 * sample lands — same return type, different column mapping.
 */
export function parseMonzoStyleCsv(csvText: string): ParsedTransaction[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new ParseError("CSV file is empty or has no data rows");
  }

  const header = lines[0].split(",").map((h) => h.trim());
  const expected = [
    "Transaction ID",
    "Date",
    "Time",
    "Type",
    "Name",
    "Emoji",
    "Category",
    "Amount",
    "Currency",
    "Local amount",
    "Local currency",
    "Notes and #tags",
    "Address",
    "Receipt",
    "Description",
    "Category split",
    "Money Out",
    "Money In",
    "Balance",
    "Balance currency",
  ];

  if (!arraysEqual(header, expected)) {
    throw new ParseError(
      `Unexpected CSV header. Expected Monzo-style columns. Got: ${header.join(", ")}`,
    );
  }

  const rows: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;

    const cols = splitCsvLine(line);
    if (cols.length < expected.length) {
      throw new ParseError(
        `Row ${i + 1}: expected ${expected.length} columns but got ${cols.length}`,
      );
    }

    const raw = Object.fromEntries(expected.map((h, j) => [h, cols[j] ?? ""]));

    const dateStr = raw["Date"];
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      throw new ParseError(`Row ${i + 1}: invalid date "${dateStr}" — expected DD/MM/YYYY`);
    }

    // Convert DD/MM/YYYY → YYYY-MM-DD for the normalized shape
    const [dd, mm, yyyy] = dateStr.split("/");
    const date = `${yyyy}-${mm}-${dd}`;

    const amount = parseNumber(raw["Amount"], `Row ${i + 1}: invalid Amount "${raw["Amount"]}"`);
    const balance = parseNumber(
      raw["Balance"],
      `Row ${i + 1}: invalid Balance "${raw["Balance"]}"`,
    );
    const currency = raw["Currency"] || "GBP";

    const description = raw["Description"] || raw["Name"] || "";

    rows.push({
      date,
      description,
      amount,
      balance,
      currency,
      raw_type: raw["Type"] || "",
      raw,
    });
  }

  return rows;
}

function parseNumber(raw: string, errorMsg: string): number {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") return 0;
  const num = Number(trimmed);
  if (isNaN(num)) throw new ParseError(errorMsg);
  return Math.round(num * 100) / 100;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/** Split a CSV line respecting quotes (basic, sufficient for bank CSVs). */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

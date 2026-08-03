import type { DocumentBody } from "./types";

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function fmt(n: number): string {
  return `£${n.toFixed(2)}`;
}

export interface InvoiceBodyInput {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  currency: string;
  subtotal: number;
  vat_total: number;
  total: number;
  notes?: string | null;
  line_items: { description: string; quantity: number; unit_price: number; line_total: number }[];
}

export function buildInvoiceBody(inv: InvoiceBodyInput): DocumentBody {
  const rowsHtml = inv.line_items
    .map(
      (li) => `
    <tr>
      <td style="text-align:left;padding:8px 12px;border-bottom:1px solid #E6E8EC;">${esc(li.description)}</td>
      <td style="text-align:right;padding:8px 12px;border-bottom:1px solid #E6E8EC;">${li.quantity}</td>
      <td style="text-align:right;padding:8px 12px;border-bottom:1px solid #E6E8EC;">${fmt(li.unit_price)}</td>
      <td style="text-align:right;padding:8px 12px;border-bottom:1px solid #E6E8EC;">${fmt(li.line_total)}</td>
    </tr>`,
    )
    .join("");

  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#F8F9FB;">
          <th style="text-align:left;padding:8px 12px;font-weight:600;">Description</th>
          <th style="text-align:right;padding:8px 12px;font-weight:600;">Qty</th>
          <th style="text-align:right;padding:8px 12px;font-weight:600;">Unit Price</th>
          <th style="text-align:right;padding:8px 12px;font-weight:600;">Total</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="text-align:right;padding:8px 12px;font-weight:600;">Subtotal</td>
          <td style="text-align:right;padding:8px 12px;font-weight:600;">${fmt(inv.subtotal)}</td>
        </tr>
        ${inv.vat_total > 0 ? `<tr>
          <td colspan="3" style="text-align:right;padding:8px 12px;">VAT</td>
          <td style="text-align:right;padding:8px 12px;">${fmt(inv.vat_total)}</td>
        </tr>` : ""}
        <tr>
          <td colspan="3" style="text-align:right;padding:8px 12px;font-weight:700;font-size:16px;">Total</td>
          <td style="text-align:right;padding:8px 12px;font-weight:700;font-size:16px;">${fmt(inv.total)}</td>
        </tr>
      </tfoot>
    </table>`;

  const sections = [
    {
      id: "invoice-details",
      title: "Invoice details",
      html: `
        <dl style="display:grid;grid-template-columns:auto 1fr;gap:4px 16px;font-size:14px;">
          <dt style="font-weight:600;">Invoice number</dt><dd>${esc(inv.invoice_number)}</dd>
          <dt style="font-weight:600;">Issue date</dt><dd>${esc(inv.issue_date)}</dd>
          <dt style="font-weight:600;">Due date</dt><dd>${esc(inv.due_date)}</dd>
          <dt style="font-weight:600;">Currency</dt><dd>${esc(inv.currency)}</dd>
        </dl>`,
    },
    {
      id: "invoice-items",
      title: "Line items",
      html: tableHtml,
    },
  ];

  if (inv.notes) {
    sections.push({
      id: "invoice-notes",
      title: "Notes",
      html: `<p>${esc(inv.notes)}</p>`,
    });
  }

  return { sections };
}

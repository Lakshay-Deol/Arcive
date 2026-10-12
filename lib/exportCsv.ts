export interface CsvReceipt {
  timestamp: number | bigint;
  direction: "Sent" | "Received" | string;
  amount: number | string | bigint;
  counterparty: string;
  category: string;
  note: string;
  id: number | string | bigint;
  txHash: string;
}

/**
 * Escapes CSV values and defends against formula injection (=, +, -, @)
 */
function sanitizeCsvValue(val: string | number | bigint | undefined | null): string {
  if (val === undefined || val === null) return '""';
  let str = String(val);

  // Formula injection neutralization
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }

  // Escape internal double quotes by doubling them
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

export function exportToCsv(receipts: CsvReceipt[], filenamePrefix = "arcive-receipts") {
  const headers = [
    "Date",
    "Direction",
    "Amount (USDC)",
    "Counterparty",
    "Category",
    "Note",
    "Receipt ID",
    "Tx Hash",
  ];

  const rows = receipts.map((r) => [
    sanitizeCsvValue(new Date(Number(r.timestamp) * 1000).toISOString()),
    sanitizeCsvValue(r.direction),
    sanitizeCsvValue((Number(r.amount) / 1e6).toFixed(6)),
    sanitizeCsvValue(r.counterparty),
    sanitizeCsvValue(r.category),
    sanitizeCsvValue(r.note),
    sanitizeCsvValue(r.id.toString()),
    sanitizeCsvValue(r.txHash),
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");

  // UTF-8 BOM so Excel opens it with correct encoding
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenamePrefix}-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

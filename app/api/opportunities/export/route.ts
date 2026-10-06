import { prisma } from "@/lib/db";

const COLUMNS = [
  "companyName",
  "roleTitle",
  "jobUrl",
  "contactName",
  "contactEmail",
  "source",
  "location",
  "status",
  "dateFound",
  "dateApplied",
  "notes",
  "createdAt",
  "updatedAt",
] as const;

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString() : String(value);
  // Neutralize spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  const opportunities = await prisma.opportunity.findMany({
    orderBy: { createdAt: "desc" },
  });

  const rows = [
    COLUMNS.join(","),
    ...opportunities.map((o) => COLUMNS.map((c) => csvCell(o[c])).join(",")),
  ];
  const date = new Date().toISOString().slice(0, 10);

  return new Response(rows.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="opportunities-${date}.csv"`,
    },
  });
}

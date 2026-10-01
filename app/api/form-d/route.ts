import { prisma } from "@/lib/db";

export async function GET() {
  const [leads, lastScan] = await Promise.all([
    prisma.formDLead.findMany({ orderBy: { dateFiled: "desc" } }),
    prisma.formDScanDay.findFirst({ orderBy: { scannedAt: "desc" } }),
  ]);
  return Response.json({ leads, lastScannedAt: lastScan?.scannedAt ?? null });
}

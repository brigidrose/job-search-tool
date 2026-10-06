import { getDb } from "@/lib/session";

export async function GET() {
  const { db: prisma } = await getDb();
  const templates = await prisma.template.findMany({
    orderBy: { title: "asc" },
  });
  return Response.json(templates);
}

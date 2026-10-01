import { prisma } from "@/lib/db";

export async function GET() {
  const templates = await prisma.template.findMany({
    orderBy: { title: "asc" },
  });
  return Response.json(templates);
}

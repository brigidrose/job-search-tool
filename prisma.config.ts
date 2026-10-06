import "dotenv/config";
import { defineConfig } from "prisma/config";

// The app keeps two copies of its tables in one Postgres database: the default
// schema holds the owner's real data, and the "demo" schema holds the sample
// data visitors see. Set PRISMA_SCHEMA=demo to point the CLI at the demo copy.
function databaseUrl() {
  const raw = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!raw) return undefined;
  const schema = process.env.PRISMA_SCHEMA;
  if (!schema) return raw;
  const url = new URL(raw);
  url.searchParams.set("schema", schema);
  return url.toString();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl(),
  },
});

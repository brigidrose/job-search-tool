import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

// One Postgres database, two copies of the tables:
//   ownerDb - the default schema, holding the owner's real data
//   demoDb  - the "demo" schema, holding sample data that visitors can edit
// Request handlers should not import these directly; they call getDb() in
// lib/session.ts, which picks the right one for whoever is making the request.

export type Db = PrismaClient;

export const DEMO_SCHEMA = "demo";

function connectionString() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add a Postgres connection string to .env");
  }
  if (!/^postgres(ql)?:\/\//.test(url)) {
    throw new Error(
      "DATABASE_URL must be a direct Postgres connection string starting with postgres://",
    );
  }
  return url;
}

function createClient(schema?: string) {
  // Keep pools small: on serverless hosts every running instance opens its own.
  const adapter = new PrismaPg(
    { connectionString: connectionString(), max: 3 },
    schema ? { schema } : undefined,
  );
  return new PrismaClient({ adapter });
}

// Created on first use (so a build without DATABASE_URL still succeeds) and
// reused across hot reloads in dev.
const cache = globalThis as unknown as { ownerDb?: PrismaClient; demoDb?: PrismaClient };

function lazy(key: "ownerDb" | "demoDb", schema?: string): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_target, property) {
      const client = (cache[key] ??= createClient(schema));
      const value = Reflect.get(client, property, client);
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}

export const ownerDb = lazy("ownerDb");
export const demoDb = lazy("demoDb", DEMO_SCHEMA);

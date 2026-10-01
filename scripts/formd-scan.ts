// Usage: npm run formd:scan [-- --days 30]
import "dotenv/config";
import { prisma } from "../lib/db";
import { scanFormD } from "../lib/formd/scan";

const daysArg = process.argv.indexOf("--days");
const days = daysArg > -1 ? Number(process.argv[daysArg + 1]) : 7;

if (!Number.isInteger(days) || days < 1 || days > 30) {
  console.error("--days must be a whole number from 1 to 30");
  process.exit(1);
}

scanFormD({ days })
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (result.errors.length > 0) process.exitCode = 1;
  })
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

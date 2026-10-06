import type { CompanyResearch } from "@/lib/types";

// Client-safe: used by the templates page.

function monthYear(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The plain-text block shown next to outreach templates. */
export function researchContext(r: CompanyResearch) {
  const news = r.recent_news[0];
  const hiring = r.hiring_signals;
  return [
    "[Company Research Context]",
    `Company: ${r.companyName}`,
    `Stage: ${[r.stage?.label, r.funding?.summary].filter(Boolean).join(" · ") || "Unknown"}`,
    `Recent news: ${
      news ? `${news.title}${news.date ? ` (${monthYear(news.date)})` : ""}` : "None found"
    }`,
    `Hiring: ${
      hiring
        ? `Yes, ${hiring.openPositions} open position${hiring.openPositions === 1 ? "" : "s"}` +
          (hiring.relevantRoles.length ? ` including ${hiring.relevantRoles.slice(0, 2).join(", ")}` : "")
        : "Unknown (check LinkedIn)"
    }`,
  ].join("\n");
}

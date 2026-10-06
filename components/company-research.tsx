"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useResearchOpportunity, useUpdateOpportunity } from "@/lib/api";
import type { CompanyResearch as Research, Opportunity } from "@/lib/types";

const SOURCE_LABELS = {
  form_d: "SEC Form D",
  crunchbase: "Crunchbase",
  news: "news headline",
} as const;

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-4 hover:text-foreground"
    >
      {children}
    </a>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_1fr]">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function ResearchDetails({ research }: { research: Research }) {
  const { funding, stage, hiring_signals: hiring, recent_news: news, links } = research;
  return (
    <dl className="grid gap-4">
      <Row label="Funding">
        {funding ? (
          <>
            {funding.url ? (
              <ExternalLink href={funding.url}>{funding.summary}</ExternalLink>
            ) : (
              funding.summary
            )}
            <span className="text-muted-foreground"> · from {SOURCE_LABELS[funding.source]}</span>
            {funding.investors.length > 0 && (
              <div className="text-muted-foreground">
                Investors: {funding.investors.join(", ")}
              </div>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">
            Not found. Look it up on{" "}
            <ExternalLink href={links.crunchbase}>Crunchbase</ExternalLink>.
          </span>
        )}
      </Row>

      <Row label="Stage">
        {stage ? (
          <>
            {stage.label}
            <div className="text-xs text-muted-foreground">{stage.basis}</div>
          </>
        ) : (
          <span className="text-muted-foreground">Unknown</span>
        )}
      </Row>

      <Row label="Hiring">
        {hiring ? (
          <>
            Actively hiring:{" "}
            <ExternalLink href={hiring.boardUrl}>
              {hiring.openPositions} open position{hiring.openPositions === 1 ? "" : "s"} on{" "}
              {hiring.provider}
            </ExternalLink>
            {hiring.relevantRoles.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {hiring.relevantRoles.map((role) => (
                  <li key={role}>{role}</li>
                ))}
              </ul>
            )}
            <div className="text-xs text-amber-700 dark:text-amber-400">
              Job board matched by company name. Confirm it&apos;s the right company.
            </div>
          </>
        ) : (
          <span className="text-muted-foreground">No public job board found. </span>
        )}{" "}
        <ExternalLink href={links.linkedinJobs}>
          LinkedIn jobs for {research.companyName}
        </ExternalLink>
      </Row>

      <Row label="Recent news">
        {news.length > 0 ? (
          <ul className="grid gap-1.5">
            {news.map((item) => (
              <li key={item.url}>
                <ExternalLink href={item.url}>{item.title}</ExternalLink>
                <span className="text-xs text-muted-foreground">
                  {" "}
                  {[item.source, formatDate(item.date)].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-muted-foreground">
            No headlines found. Try{" "}
            <ExternalLink href={links.googleNews}>Google News</ExternalLink>.
          </span>
        )}
      </Row>

      {research.errors.length > 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Some sources were unavailable: {research.errors.join("; ")}. Manual lookup:{" "}
          <ExternalLink href={links.google}>Google</ExternalLink>
        </p>
      )}
    </dl>
  );
}

export function CompanyResearch({ opportunity }: { opportunity: Opportunity }) {
  const fetchResearch = useResearchOpportunity(opportunity.id);
  const update = useUpdateOpportunity(opportunity.id);
  const research = opportunity.research;
  const q = encodeURIComponent(opportunity.companyName);

  // Auto-fetch the first time an opportunity is viewed; cached afterwards.
  const { mutate } = fetchResearch;
  const requested = useRef(false);
  useEffect(() => {
    if (!research && !requested.current) {
      requested.current = true;
      mutate();
    }
  }, [research, mutate]);

  async function saveNewsQuery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newsQuery = String(new FormData(event.currentTarget).get("newsQuery") ?? "");
    try {
      await update.mutateAsync({ newsQuery });
      await fetchResearch.mutateAsync();
      toast.success("Research refreshed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't refresh research");
    }
  }

  const busy = fetchResearch.isPending || update.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Company Research</CardTitle>
          {opportunity.researchFetchedAt && (
            <p className="text-xs text-muted-foreground">
              Fetched {formatDate(opportunity.researchFetchedAt)} from public sources. Verify
              before using it in outreach.
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() =>
            fetchResearch.mutate(undefined, {
              onSuccess: () => toast.success("Research refreshed"),
            })
          }
        >
          {fetchResearch.isPending ? "Fetching..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-5">
        {research ? (
          <ResearchDetails research={research} />
        ) : fetchResearch.isError ? (
          <p className="text-sm text-muted-foreground">
            Research not available. Manual lookup:{" "}
            <ExternalLink href={`https://www.google.com/search?q=${q}+company+funding+careers`}>
              Google
            </ExternalLink>
            {" · "}
            <ExternalLink href={`https://www.linkedin.com/jobs/search/?keywords=${q}`}>
              LinkedIn jobs
            </ExternalLink>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Fetching...</p>
        )}

        <form onSubmit={saveNewsQuery} className="grid gap-1.5 border-t pt-4">
          <label htmlFor="newsQuery" className="text-sm font-medium">
            Refine news search
          </label>
          <p className="text-xs text-muted-foreground">
            If the headlines are about something else (common for one-word names), enter
            better search terms, like the company name plus what it does.
          </p>
          <div className="flex gap-2">
            <Input
              id="newsQuery"
              name="newsQuery"
              key={opportunity.newsQuery ?? ""}
              defaultValue={opportunity.newsQuery ?? ""}
              placeholder={`"${opportunity.companyName}" ...`}
            />
            <Button type="submit" variant="outline" disabled={busy}>
              {busy ? "Searching..." : "Search"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

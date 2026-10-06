"use client";

import Link from "next/link";
import { use } from "react";
import { toast } from "sonner";
import { CompanyResearch } from "@/components/company-research";
import { FIT_COLORS, FitBadge } from "@/components/fit-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFitScore, useOpportunity, useUpdateOpportunity } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FIT_LABELS, STATUS_LABELS, type Opportunity } from "@/lib/types";

function FitScoreCard({ id }: { id: string }) {
  const { data: fit, isPending, error } = useFitScore(id);
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Fit Score</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <p className="text-sm text-muted-foreground">Scoring...</p>
        ) : error ? (
          <p className="text-sm text-destructive">Couldn&apos;t score: {error.message}</p>
        ) : (
          <div className="flex flex-wrap items-start gap-6">
            <div
              className={cn(
                "grid size-24 shrink-0 place-items-center rounded-2xl text-center",
                FIT_COLORS[fit.badge],
              )}
            >
              <div>
                <div className="text-4xl font-semibold tabular-nums leading-none">
                  {fit.score}
                </div>
                <div className="mt-1 text-xs font-medium">out of 10</div>
              </div>
            </div>
            <div className="grid gap-2">
              <FitBadge fit={fit} className="w-fit text-sm" />
              <ul className="list-disc pl-5 text-sm">
                {fit.reasoning.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Starts at 5, plus points for matching your{" "}
                <Link href="/settings" className="underline underline-offset-4">
                  search profile
                </Link>
                . {FIT_LABELS.hot} is 8 or higher.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Details({ opportunity: o }: { opportunity: Opportunity }) {
  const update = useUpdateOpportunity(o.id);

  function saveLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const location = String(new FormData(event.currentTarget).get("location") ?? "");
    update.mutate(
      { location },
      {
        onSuccess: () => toast.success("Location saved"),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  const rows: [string, React.ReactNode][] = [
    ["Status", STATUS_LABELS[o.status]],
    ["Contact", [o.contactName, o.contactEmail].filter(Boolean).join(" · ") || "—"],
    ["Source", o.source ?? "—"],
  ];

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <dl className="grid gap-2">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[7rem_1fr] gap-1">
              <dt className="font-medium text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <form onSubmit={saveLocation} className="grid gap-1.5">
          <label htmlFor="location" className="font-medium text-muted-foreground">
            Location
          </label>
          <div className="flex gap-2">
            <Input
              id="location"
              name="location"
              key={o.location ?? ""}
              defaultValue={o.location ?? ""}
              placeholder="Remote, Charlotte, NC, ..."
            />
            <Button type="submit" variant="outline" disabled={update.isPending}>
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            A location in your search profile (or &quot;Remote&quot;, if you&apos;re open to
            it) adds a point to the fit score.
          </p>
        </form>
        {o.notes && (
          <div className="grid gap-1.5">
            <div className="font-medium text-muted-foreground">Notes</div>
            <p className="whitespace-pre-wrap wrap-anywhere">{o.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function OpportunityPage({ params }: PageProps<"/opportunities/[id]">) {
  const { id } = use(params);
  const { data: opportunity, isPending, error } = useOpportunity(id);

  if (isPending) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (error) {
    return (
      <div className="grid gap-4">
        <p className="text-sm text-destructive">{error.message}</p>
        <Link href="/" className="text-sm underline underline-offset-4">
          Back to opportunities
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Opportunities
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{opportunity.companyName}</h1>
            <FitBadge fit={opportunity.fit} />
          </div>
          <p className="text-muted-foreground">{opportunity.roleTitle}</p>
        </div>
        <div className="flex gap-2">
          {opportunity.jobUrl && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={opportunity.jobUrl} target="_blank" rel="noopener noreferrer" />}
            >
              Job posting
            </Button>
          )}
          <Button
            nativeButton={false}
            render={<Link href={`/templates?opportunity=${opportunity.id}`} />}
          >
            Write outreach
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FitScoreCard id={id} />
        <Details opportunity={opportunity} />
      </div>

      <CompanyResearch opportunity={opportunity} />
    </div>
  );
}

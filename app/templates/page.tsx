"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOpportunities, useResearchOpportunity, useTemplates } from "@/lib/api";
import { researchContext } from "@/lib/research-context";
import type { Opportunity } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLACEHOLDERS = ["Company", "Contact Name", "Role", "Specific Detail"] as const;
type Placeholder = (typeof PLACEHOLDERS)[number];
type Values = Record<Placeholder, string>;

const EMPTY_VALUES: Values = {
  Company: "",
  "Contact Name": "",
  Role: "",
  "Specific Detail": "",
};

// Splits the body into text and placeholder parts so unfilled
// placeholders can be highlighted in the preview.
function renderPreview(body: string, values: Values) {
  return body.split(/(\[[^\]]+\])/g).map((part, i) => {
    const key = part.slice(1, -1) as Placeholder;
    if (!part.startsWith("[") || !PLACEHOLDERS.includes(key)) return part;
    const value = values[key].trim();
    return value ? (
      <span key={i}>{value}</span>
    ) : (
      <mark key={i} className="rounded bg-amber-100 px-0.5 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
        {part}
      </mark>
    );
  });
}

function fillTemplate(body: string, values: Values) {
  return body.replace(/\[([^\]]+)\]/g, (match, key: string) => {
    const value = values[key as Placeholder]?.trim();
    return value || match;
  });
}

// Research for the chosen opportunity, as a block to read while personalizing.
function ResearchContextCard({ opportunity }: { opportunity: Opportunity }) {
  const fetchResearch = useResearchOpportunity(opportunity.id);
  const context = opportunity.research ? researchContext(opportunity.research) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Company research context</CardTitle>
        {context ? (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(context);
              toast.success("Copied to clipboard");
            }}
          >
            Copy
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={fetchResearch.isPending}
            onClick={() =>
              fetchResearch.mutate(undefined, { onError: (err) => toast.error(err.message) })
            }
          >
            {fetchResearch.isPending ? "Fetching..." : "Fetch research"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid gap-2">
        {context ? (
          <pre className="whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">
            {context}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">
            No research saved for {opportunity.companyName} yet.
          </p>
        )}
        <Link
          href={`/opportunities/${opportunity.id}`}
          className="text-xs text-muted-foreground underline underline-offset-4"
        >
          Full research and fit score
        </Link>
      </CardContent>
    </Card>
  );
}

export default function TemplatesPage() {
  return (
    // useSearchParams needs a Suspense boundary so the page can prerender.
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
      <Templates />
    </Suspense>
  );
}

function Templates() {
  const templates = useTemplates();
  const opportunities = useOpportunities();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // "Write outreach" on an opportunity links here with ?opportunity=<id>.
  const [opportunityId, setOpportunityId] = useState<string | null>(
    useSearchParams().get("opportunity"),
  );
  // What the user has typed; fields left untouched fall back to the opportunity.
  const [edits, setEdits] = useState<Partial<Values>>({});

  const opportunity = opportunities.data?.find((o) => o.id === opportunityId) ?? null;
  const values: Values = {
    ...EMPTY_VALUES,
    ...(opportunity && {
      Company: opportunity.companyName,
      Role: opportunity.roleTitle,
      "Contact Name": opportunity.contactName ?? "",
    }),
    ...edits,
  };

  const selected =
    templates.data?.find((t) => t.id === selectedId) ?? templates.data?.[0];

  const opportunityItems = (opportunities.data ?? []).map((o) => ({
    value: o.id,
    label: `${o.companyName} — ${o.roleTitle}`,
  }));

  function applyOpportunity(id: string | null) {
    setOpportunityId(id);
    // Keep only the detail the user wrote; the rest comes from the new opportunity.
    setEdits((e) =>
      e["Specific Detail"] === undefined ? {} : { "Specific Detail": e["Specific Detail"] },
    );
  }

  async function copyToClipboard() {
    if (!selected) return;
    await navigator.clipboard.writeText(fillTemplate(selected.body, values));
    toast.success("Copied to clipboard");
  }

  if (templates.isPending) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }
  if (templates.error) {
    return (
      <p className="text-sm text-destructive">
        Couldn&apos;t load templates: {templates.error.message}
      </p>
    );
  }

  return (
    <div className="grid gap-8">
      <h1 className="text-2xl font-semibold">Templates</h1>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <ul className="grid content-start gap-2">
          {templates.data.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted",
                  selected?.id === t.id && "border-foreground/30 bg-muted",
                )}
              >
                <div className="text-sm font-medium">{t.title}</div>
                <Badge variant="secondary" className="mt-1">
                  {t.category}
                </Badge>
              </button>
            </li>
          ))}
        </ul>

        {selected && (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Personalize</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label>Fill from opportunity</Label>
                  <Select
                    items={opportunityItems}
                    value={opportunityId}
                    onValueChange={(id) => applyOpportunity(id as string | null)}
                  >
                    <SelectTrigger className="w-full sm:w-96">
                      <SelectValue placeholder="Choose an opportunity" />
                    </SelectTrigger>
                    <SelectContent>
                      {opportunityItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {PLACEHOLDERS.map((p) => (
                    <div key={p} className="grid gap-1.5">
                      <Label htmlFor={p}>[{p}]</Label>
                      <Input
                        id={p}
                        value={values[p]}
                        onChange={(e) => setEdits((v) => ({ ...v, [p]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {opportunity && <ResearchContextCard opportunity={opportunity} />}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{selected.title}</CardTitle>
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  Copy
                </Button>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {renderPreview(selected.body, values)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

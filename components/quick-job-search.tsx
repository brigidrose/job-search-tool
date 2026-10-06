"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useGeneratedDorks } from "@/lib/api";
import { DORK_CATEGORIES, googleSearchUrl } from "@/lib/dorks";

function DorkRow({ dork, pastWeekOnly }: { dork: string; pastWeekOnly: boolean }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <code className="min-w-0 text-xs leading-relaxed wrap-anywhere">{dork}</code>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(dork);
            toast.success("Copied to clipboard");
          }}
        >
          Copy
        </Button>
        <Button
          size="sm"
          nativeButton={false}
          render={
            <a
              href={googleSearchUrl(dork, pastWeekOnly)}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          Search
        </Button>
      </div>
    </li>
  );
}

// Dashboard section: Google queries generated from the search profile. Nothing
// is searched automatically; each button opens Google in a new tab.
export function QuickJobSearch() {
  const { data: dorks, isPending, error } = useGeneratedDorks();
  const [pastWeekOnly, setPastWeekOnly] = useState(true);

  const categories = dorks
    ? DORK_CATEGORIES.filter(({ key }) => dorks[key].length > 0)
    : [];

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">Quick Job Search</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Your search profile generates these Google queries. They look at hiring platforms
            and company career pages directly, where roles appear before job aggregators list
            them.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="pastWeekOnly"
              checked={pastWeekOnly}
              onCheckedChange={setPastWeekOnly}
            />
            <Label htmlFor="pastWeekOnly">Past week only</Label>
          </div>
          <Button variant="outline" nativeButton={false} render={<Link href="/settings" />}>
            Settings
          </Button>
        </div>
      </div>

      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : error ? (
        <p className="text-sm text-destructive">Couldn&apos;t load searches: {error.message}</p>
      ) : categories.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Add at least one job title in{" "}
          <Link href="/settings" className="underline underline-offset-4">
            your search profile
          </Link>{" "}
          to generate searches.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {categories.map(({ key, label }) => (
            <div key={key} className="min-w-0 rounded-lg border p-4">
              <h3 className="text-sm font-medium">{label}</h3>
              <ul className="divide-y">
                {dorks![key].map((dork) => (
                  <DorkRow key={dork} dork={dork} pastWeekOnly={pastWeekOnly} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

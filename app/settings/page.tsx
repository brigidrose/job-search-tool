"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChipMultiSelect } from "@/components/chip-multi-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSaveSearchProfile, useSearchProfile } from "@/lib/api";
import {
  GEOGRAPHY_OPTIONS,
  INDUSTRY_OPTIONS,
  JOB_TITLE_OPTIONS,
  STAGE_OPTIONS,
  type SearchProfile,
  type SearchProfileInput,
} from "@/lib/search-profile";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );
}

function ProfileForm({ initial }: { initial: SearchProfile }) {
  const save = useSaveSearchProfile();
  const [profile, setProfile] = useState<SearchProfileInput>(initial);
  // Salaries and custom searches are edited as text and parsed on save.
  const [minSalary, setMinSalary] = useState(initial.minSalary?.toString() ?? "");
  const [maxSalary, setMaxSalary] = useState(initial.maxSalary?.toString() ?? "");
  const [customDorks, setCustomDorks] = useState(initial.customDorks.join("\n"));

  const set = <K extends keyof SearchProfileInput>(key: K) => (value: SearchProfileInput[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    save.mutate(
      {
        ...profile,
        minSalary: minSalary.trim() === "" ? null : Number(minSalary),
        maxSalary: maxSalary.trim() === "" ? null : Number(maxSalary),
        customDorks: customDorks.split("\n"),
      },
      {
        onSuccess: () => toast.success("Search profile saved"),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <Section
        title="Job Titles"
        description="Used in every generated search. The first six are included in each query."
      >
        <ChipMultiSelect
          options={JOB_TITLE_OPTIONS}
          value={profile.jobTitles}
          onChange={set("jobTitles")}
          customLabel="Add a custom job title"
          customPlaceholder="Add a title, e.g. Chief of Staff"
        />
      </Section>

      <Section
        title="Industries"
        description="Raises the match score of Form D leads that look like these industries. Never hides a lead, because filings only give a rough industry."
      >
        <ChipMultiSelect
          options={INDUSTRY_OPTIONS}
          value={profile.industries}
          onChange={set("industries")}
          customLabel="Add a custom industry"
          customPlaceholder="Add an industry, e.g. Robotics"
        />
      </Section>

      <Section
        title="Geography"
        description="Form D leads are matched on the company's filing address. Leave empty for anywhere."
      >
        <div className="flex items-center gap-3">
          <Switch
            id="allowRemote"
            checked={profile.allowRemote}
            onCheckedChange={set("allowRemote")}
          />
          <Label htmlFor="allowRemote">Open to remote</Label>
        </div>
        <ChipMultiSelect
          options={GEOGRAPHY_OPTIONS}
          value={profile.geographies}
          onChange={set("geographies")}
          customLabel="Add a custom location"
          customPlaceholder="Add a city or state, e.g. Boston"
        />
      </Section>

      <Section
        title="Company Stage"
        description="Form D filings don't name the round, so a lead's stage is estimated from its raise size: under $5M is Seed, $5M–$20M is Series A, above that is Series B or later. Leave empty for any stage."
      >
        <ChipMultiSelect
          options={STAGE_OPTIONS}
          value={profile.companyStages}
          onChange={set("companyStages")}
        />
      </Section>

      <Section
        title="Salary (optional)"
        description="Saved for your reference. Not used for filtering yet, since neither filings nor Google searches expose salary reliably."
      >
        <div className="flex flex-wrap gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="minSalary">Minimum ($/year)</Label>
            <Input
              id="minSalary"
              type="number"
              min={0}
              step={1000}
              className="w-44"
              value={minSalary}
              onChange={(e) => setMinSalary(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="maxSalary">Maximum ($/year)</Label>
            <Input
              id="maxSalary"
              type="number"
              min={0}
              step={1000}
              className="w-44"
              value={maxSalary}
              onChange={(e) => setMaxSalary(e.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section
        title="Custom Searches"
        description="Your own Google queries, one per line. They appear with the generated ones in Quick Job Search."
      >
        <Textarea
          rows={4}
          aria-label="Custom Google searches, one per line"
          className="font-mono text-sm"
          placeholder={'site:jobs.ashbyhq.com "Chief of Staff" remote'}
          value={customDorks}
          onChange={(e) => setCustomDorks(e.target.value)}
        />
      </Section>

      <div>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const { data: profile, isPending, error } = useSearchProfile();

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Search Profile</h1>
        <p className="text-sm text-muted-foreground">
          Configure what &quot;relevant&quot; means for you
        </p>
      </div>
      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : error ? (
        <p className="text-sm text-destructive">Couldn&apos;t load profile: {error.message}</p>
      ) : (
        // Remount when a saved profile arrives so the form picks up server-side cleanup.
        <ProfileForm key={profile.updatedAt} initial={profile} />
      )}
    </div>
  );
}

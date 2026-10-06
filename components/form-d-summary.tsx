"use client";

import Link from "next/link";
import { FormDTable, isNewLead } from "@/components/form-d-table";
import { useFormDLeads } from "@/lib/api";

const SHOWN = 5;

// Dashboard section: Form D leads that fit the search profile and haven't been
// added as opportunities yet, best matches first.
export function FormDSummary() {
  const { data, isPending, error } = useFormDLeads(true);
  if (isPending || error) return null;

  const open = data.leads
    .filter((l) => !l.opportunityId)
    .sort((a, b) => b.matchScore - a.matchScore);
  const newCount = open.filter(isNewLead).length;

  return (
    <section className="grid gap-3 *:min-w-0">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">
          Form D leads matching your profile{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {open.length} to review · {newCount} new in the last 2 days
          </span>
        </h2>
        <Link href="/form-d" className="text-sm underline-offset-4 hover:underline">
          View all
        </Link>
      </div>
      <FormDTable leads={open.slice(0, SHOWN)} compact />
    </section>
  );
}

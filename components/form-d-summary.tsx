"use client";

import Link from "next/link";
import { FormDTable, isNewLead } from "@/components/form-d-table";
import { useFormDLeads } from "@/lib/api";

const SHOWN = 5;

// Dashboard section: the newest Form D leads not yet added as opportunities.
export function FormDSummary() {
  const { data, isPending, error } = useFormDLeads();
  if (isPending || error) return null;

  const open = data.leads.filter((l) => !l.opportunityId);
  const newCount = open.filter(isNewLead).length;

  return (
    <section className="grid gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">
          New Form D leads{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {newCount} new in the last 2 days · {open.length} not yet added
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

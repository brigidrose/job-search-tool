"use client";

import { AddOpportunityDialog } from "@/components/add-opportunity-dialog";
import { DashboardStats } from "@/components/dashboard-stats";
import { OpportunitiesTable } from "@/components/opportunities-table";
import { Button } from "@/components/ui/button";
import { useOpportunities } from "@/lib/api";

export default function HomePage() {
  const { data: opportunities, isPending, error } = useOpportunities();

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Opportunities</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href="/api/opportunities/export" download />}
          >
            Export CSV
          </Button>
          <AddOpportunityDialog />
        </div>
      </div>

      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : error ? (
        <p className="text-sm text-destructive">Couldn&apos;t load opportunities: {error.message}</p>
      ) : (
        <>
          <DashboardStats opportunities={opportunities} />
          <OpportunitiesTable opportunities={opportunities} />
        </>
      )}
    </div>
  );
}

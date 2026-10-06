"use client";

import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { FitBadge } from "@/components/fit-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUpdateStatus } from "@/lib/api";
import { STATUSES, STATUS_LABELS, isStatus, type Opportunity } from "@/lib/types";

const STATUS_ITEMS = STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));

const SORT_ITEMS = [
  { value: "newest", label: "Newest first" },
  { value: "fit", label: "Best fit first" },
] as const;
type Sort = (typeof SORT_ITEMS)[number]["value"];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusSelect({ opportunity }: { opportunity: Opportunity }) {
  const update = useUpdateStatus();
  return (
    <Select
      items={STATUS_ITEMS}
      value={opportunity.status}
      onValueChange={(value) => {
        if (!isStatus(value)) return;
        update.mutate(
          { id: opportunity.id, status: value },
          { onError: (err) => toast.error(`Couldn't update status: ${err.message}`) },
        );
      }}
    >
      <SelectTrigger size="sm" className="w-44" aria-label="Status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_ITEMS.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function OpportunitiesTable({ opportunities }: { opportunities: Opportunity[] }) {
  const [sort, setSort] = useState<Sort>("newest");

  if (opportunities.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No opportunities yet. Add your first one to get started.
      </p>
    );
  }

  // The API returns newest first; sort() is stable, so ties keep that order.
  const sorted =
    sort === "fit"
      ? [...opportunities].sort((a, b) => b.fit.score - a.fit.score)
      : opportunities;

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">Sort</span>
        <Select
          items={SORT_ITEMS}
          value={sort}
          onValueChange={(value) => value && setSort(value as Sort)}
        >
          <SelectTrigger size="sm" className="w-40" aria-label="Sort opportunities">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fit</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Found</TableHead>
              <TableHead>Applied</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <FitBadge fit={o.fit} />
                </TableCell>
                <TableCell className="font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <Link
                      href={`/opportunities/${o.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {o.companyName}
                    </Link>
                    {o.jobUrl && (
                      <a
                        href={o.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Open the job posting for ${o.companyName}`}
                      >
                        <ExternalLinkIcon className="size-3.5" />
                      </a>
                    )}
                  </span>
                </TableCell>
                <TableCell>{o.roleTitle}</TableCell>
                <TableCell>
                  {o.contactName || o.contactEmail ? (
                    <div className="flex flex-col">
                      <span>{o.contactName ?? "—"}</span>
                      {o.contactEmail && (
                        <a
                          href={`mailto:${o.contactEmail}`}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          {o.contactEmail}
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusSelect opportunity={o} />
                </TableCell>
                <TableCell className="tabular-nums">{formatDate(o.dateFound)}</TableCell>
                <TableCell className="tabular-nums">{formatDate(o.dateApplied)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

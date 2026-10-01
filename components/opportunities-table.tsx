"use client";

import { toast } from "sonner";
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
  if (opportunities.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No opportunities yet. Add your first one to get started.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Found</TableHead>
            <TableHead>Applied</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium">
                {o.jobUrl ? (
                  <a
                    href={o.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-4 hover:underline"
                  >
                    {o.companyName}
                  </a>
                ) : (
                  o.companyName
                )}
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
  );
}

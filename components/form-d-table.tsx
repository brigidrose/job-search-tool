"use client";

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAddFormDLead, useSetRemoteFriendly } from "@/lib/api";
import type { FormDLead } from "@/lib/types";

// Form D dates are calendar dates stored as UTC midnight.
export function formatCalendarDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatMoney(n: number | null) {
  if (n === null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

export function isNewLead(lead: FormDLead) {
  return Date.now() - new Date(lead.createdAt).getTime() < 2 * 86_400_000;
}

const ROLE_ABBREVIATIONS: Record<string, string> = {
  "Executive Officer": "Exec",
  Director: "Dir",
  Promoter: "Promoter",
};

function Principals({ lead, max = 3 }: { lead: FormDLead; max?: number }) {
  // Executives first; they're the likeliest hiring contacts.
  const sorted = [...lead.principals].sort(
    (a, b) =>
      Number(b.relationships.includes("Executive Officer")) -
      Number(a.relationships.includes("Executive Officer")),
  );
  return (
    <ul className="text-sm">
      {sorted.slice(0, max).map((p) => (
        <li key={p.name}>
          {p.name}{" "}
          <span className="text-xs text-muted-foreground">
            {p.relationships.map((r) => ROLE_ABBREVIATIONS[r] ?? r).join(", ")}
          </span>
        </li>
      ))}
      {sorted.length > max && (
        <li className="text-xs text-muted-foreground">+{sorted.length - max} more</li>
      )}
    </ul>
  );
}

function AddButton({ lead }: { lead: FormDLead }) {
  const add = useAddFormDLead();
  if (lead.opportunityId) {
    return (
      <Badge variant="secondary" className="whitespace-nowrap">
        Added
      </Badge>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={add.isPending}
      onClick={() =>
        add.mutate(lead.id, {
          onSuccess: ({ alreadyTracked }) =>
            toast.success(
              alreadyTracked
                ? `${lead.companyName} was already in your opportunities; linked it`
                : `Added ${lead.companyName} to your opportunities`,
            ),
          onError: (err) => toast.error(err.message),
        })
      }
    >
      {add.isPending ? "Adding..." : "Add"}
    </Button>
  );
}

function RemoteToggle({ lead }: { lead: FormDLead }) {
  const update = useSetRemoteFriendly();
  return (
    <Switch
      checked={lead.remoteFriendly}
      disabled={update.isPending}
      aria-label={`${lead.companyName} is remote-friendly`}
      onCheckedChange={(remoteFriendly) =>
        update.mutate(
          { id: lead.id, remoteFriendly },
          { onError: (err) => toast.error(err.message) },
        )
      }
    />
  );
}

export function FormDTable({
  leads,
  compact = false,
}: {
  leads: FormDLead[];
  compact?: boolean;
}) {
  if (leads.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No Form D leads match. Try widening the filters or running a scan.
      </p>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Match</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Raise</TableHead>
            <TableHead>Principals</TableHead>
            <TableHead>Filed</TableHead>
            {!compact && <TableHead>Guessed contacts</TableHead>}
            {!compact && <TableHead>Remote</TableHead>}
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} className="align-top">
              <TableCell>
                <span
                  className="font-medium tabular-nums"
                  title="How well this lead fits your search profile, out of 10"
                >
                  {lead.matchScore}
                  <span className="text-xs font-normal text-muted-foreground">/10</span>
                </span>
              </TableCell>
              <TableCell className="max-w-64 whitespace-normal">
                <div className="flex flex-wrap items-center gap-1.5">
                  <a
                    href={`https://www.sec.gov/Archives/edgar/data/${Number(lead.cik)}/${lead.accessionNumber.replace(/-/g, "")}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline-offset-4 hover:underline"
                    title="View the filing on SEC EDGAR"
                  >
                    {lead.companyName}
                  </a>
                  {isNewLead(lead) && <Badge>New</Badge>}
                  {lead.remoteFriendly && <Badge variant="secondary">Remote</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {[lead.location, lead.industry].filter(Boolean).join(" · ")}
                </div>
                {lead.reasonsForMatch.length > 0 && (
                  <div className="mt-1 text-xs text-green-700 dark:text-green-400">
                    {lead.reasonsForMatch.join(" · ")}
                  </div>
                )}
              </TableCell>
              <TableCell className="tabular-nums">
                <div>{formatMoney(lead.totalOfferingAmount ?? lead.totalAmountSold)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatMoney(lead.totalAmountSold)} sold
                </div>
                {lead.stage && (
                  <div className="text-xs text-muted-foreground">{lead.stage}</div>
                )}
              </TableCell>
              <TableCell className="whitespace-normal">
                <Principals lead={lead} max={compact ? 2 : 3} />
              </TableCell>
              <TableCell className="tabular-nums">
                <div>{formatCalendarDate(lead.dateFiled)}</div>
                <div className="text-xs text-muted-foreground">
                  1st sale {formatCalendarDate(lead.dateOfFirstSale)}
                </div>
              </TableCell>
              {!compact && (
                <TableCell className="whitespace-normal text-xs">
                  {lead.suggestedEmails.length > 0 ? (
                    <div className="grid gap-0.5">
                      {lead.suggestedEmails.map((email) => (
                        <span key={email} className="font-mono">
                          {email}
                        </span>
                      ))}
                      <span className="text-amber-700 dark:text-amber-400">
                        Unverified guess
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {lead.phone ? `No domain found · ${lead.phone}` : "No domain found"}
                    </span>
                  )}
                </TableCell>
              )}
              {!compact && (
                <TableCell>
                  <RemoteToggle lead={lead} />
                </TableCell>
              )}
              <TableCell className="text-right">
                <AddButton lead={lead} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

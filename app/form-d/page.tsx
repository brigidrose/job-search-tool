"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FormDTable } from "@/components/form-d-table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormDLeads, useScanFormD } from "@/lib/api";
import type { FormDLead } from "@/lib/types";

type Option<T extends string> = { value: T; label: string };

const GEOGRAPHY = [
  { value: "all", label: "Anywhere" },
  { value: "southeast", label: "Southeast" },
  { value: "remote", label: "Remote-friendly" },
  { value: "either", label: "Southeast or remote" },
] as const satisfies Option<string>[];

const AMOUNT = [
  { value: "all", label: "$3M–$50M" },
  { value: "3-10", label: "$3M–$10M" },
  { value: "10-25", label: "$10M–$25M" },
  { value: "25-50", label: "$25M–$50M" },
] as const satisfies Option<string>[];

const FILED = [
  { value: "all", label: "Any time" },
  { value: "3", label: "Last 3 days" },
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
] as const satisfies Option<string>[];

const STATUS = [
  { value: "open", label: "Not yet added" },
  { value: "all", label: "All leads" },
] as const satisfies Option<string>[];

type Filters = {
  geography: (typeof GEOGRAPHY)[number]["value"];
  amount: (typeof AMOUNT)[number]["value"];
  filed: (typeof FILED)[number]["value"];
  status: (typeof STATUS)[number]["value"];
};

function matches(lead: FormDLead, f: Filters) {
  if (f.geography === "southeast" && !lead.isSoutheast) return false;
  if (f.geography === "remote" && !lead.remoteFriendly) return false;
  if (f.geography === "either" && !lead.isSoutheast && !lead.remoteFriendly) return false;

  if (f.amount !== "all") {
    const [min, max] = f.amount.split("-").map((n) => Number(n) * 1_000_000);
    const raise = lead.totalOfferingAmount ?? lead.totalAmountSold ?? 0;
    if (raise < min || raise > max) return false;
  }

  if (f.filed !== "all") {
    const ageDays = (Date.now() - new Date(lead.dateFiled).getTime()) / 86_400_000;
    if (ageDays > Number(f.filed)) return false;
  }

  if (f.status === "open" && lead.opportunityId) return false;
  return true;
}

function FilterSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select items={options} value={value} onValueChange={(v) => v && onChange(v as T)}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function FormDPage() {
  const { data, isPending, error } = useFormDLeads();
  const scan = useScanFormD();
  const [filters, setFilters] = useState<Filters>({
    geography: "all",
    amount: "all",
    filed: "all",
    status: "open",
  });

  const set = <K extends keyof Filters>(key: K) => (value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const leads = data?.leads.filter((l) => matches(l, filters)) ?? [];

  function runScan() {
    const toastId = toast.loading("Scanning SEC EDGAR for new Form D filings...");
    scan.mutate(7, {
      onSuccess: (r) =>
        toast.success(
          r.filingsSeen === 0
            ? "Already up to date; no new filing days to scan"
            : `Scanned ${r.filingsSeen} filings, found ${r.leadsAdded} new leads` +
                (r.errors.length ? ` (${r.errors.length} errors; rerun to retry)` : ""),
          { id: toastId },
        ),
      onError: (err) => toast.error(err.message, { id: toastId }),
    });
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">Form D Leads</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Companies that just filed an SEC Form D: $3M–$50M raises with a first sale in the
            last 30 days. Funds, SPVs, and real-estate vehicles are filtered out. Guessed
            emails are patterns, not verified addresses. Check them before reaching out.
          </p>
        </div>
        <div className="grid justify-items-end gap-1">
          <Button onClick={runScan} disabled={scan.isPending}>
            {scan.isPending ? "Scanning..." : "Scan now"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {data?.lastScannedAt
              ? `Last scan ${new Date(data.lastScannedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}`
              : "Never scanned"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <FilterSelect label="Geography" options={GEOGRAPHY} value={filters.geography} onChange={set("geography")} />
        <FilterSelect label="Raise" options={AMOUNT} value={filters.amount} onChange={set("amount")} />
        <FilterSelect label="Filed" options={FILED} value={filters.filed} onChange={set("filed")} />
        <FilterSelect label="Show" options={STATUS} value={filters.status} onChange={set("status")} />
      </div>

      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : error ? (
        <p className="text-sm text-destructive">Couldn&apos;t load leads: {error.message}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {leads.length} of {data.leads.length} leads
          </p>
          <FormDTable leads={leads} />
        </>
      )}
    </div>
  );
}

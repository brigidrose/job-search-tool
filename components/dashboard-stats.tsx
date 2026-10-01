import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  OUTREACH_SENT_STATUSES,
  STATUSES,
  STATUS_LABELS,
  type Opportunity,
} from "@/lib/types";

export function DashboardStats({ opportunities }: { opportunities: Opportunity[] }) {
  const total = opportunities.length;
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<
    (typeof STATUSES)[number],
    number
  >;
  for (const o of opportunities) byStatus[o.status]++;

  const outreachCount = OUTREACH_SENT_STATUSES.reduce((n, s) => n + byStatus[s], 0);
  const outreachPct = total === 0 ? 0 : Math.round((outreachCount / total) * 100);

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1fr_2fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total leads
          </CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold tabular-nums">{total}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Outreach sent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tabular-nums">{outreachPct}%</div>
          <p className="text-xs text-muted-foreground">
            {outreachCount} of {total} leads
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Leads by status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {STATUSES.map((s) => (
              <li key={s} className="flex justify-between">
                <span className="text-muted-foreground">{STATUS_LABELS[s]}</span>
                <span className="font-medium tabular-nums">{byStatus[s]}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

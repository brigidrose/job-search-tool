"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateOpportunity } from "@/lib/api";
import type { NewOpportunity } from "@/lib/types";

const FIELDS: {
  name: keyof NewOpportunity;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}[] = [
  { name: "companyName", label: "Company", required: true },
  { name: "roleTitle", label: "Role", required: true },
  { name: "jobUrl", label: "Job URL", type: "url", placeholder: "https://" },
  { name: "contactName", label: "Contact name" },
  { name: "contactEmail", label: "Contact email", type: "email" },
  { name: "source", label: "Source", placeholder: "LinkedIn, referral, ..." },
];

export function AddOpportunityDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateOpportunity();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const input = Object.fromEntries(
      [...FIELDS.map((f) => f.name), "notes"].map((name) => [
        name,
        String(form.get(name) ?? ""),
      ]),
    ) as NewOpportunity;

    try {
      const created = await create.mutateAsync(input);
      toast.success(`Added ${created.roleTitle} at ${created.companyName}`);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Add opportunity</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add opportunity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.name} className="grid gap-1.5">
                <Label htmlFor={f.name}>
                  {f.label}
                  {f.required && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id={f.name}
                  name={f.name}
                  type={f.type ?? "text"}
                  required={f.required}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

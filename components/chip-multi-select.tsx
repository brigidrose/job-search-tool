"use client";

import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Toggleable preset options plus free-text entries the user adds. */
export function ChipMultiSelect({
  options,
  value,
  onChange,
  customPlaceholder,
  customLabel,
}: {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  customPlaceholder?: string;
  // Accessible name for the free-text input. Omit to disallow custom entries.
  customLabel?: string;
}) {
  const [draft, setDraft] = useState("");
  const lower = (s: string) => s.toLowerCase();
  // Custom entries show as chips after the presets.
  const custom = value.filter((v) => !options.some((o) => lower(o) === lower(v)));
  const selected = (option: string) => value.some((v) => lower(v) === lower(option));

  function toggle(option: string) {
    onChange(
      selected(option) ? value.filter((v) => lower(v) !== lower(option)) : [...value, option],
    );
  }

  function addCustom() {
    const text = draft.trim();
    if (text && !selected(text)) onChange([...value, text]);
    setDraft("");
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {[...options, ...custom].map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={selected(option)}
            onClick={() => toggle(option)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors",
              selected(option)
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {selected(option) && <CheckIcon className="size-3.5" aria-hidden />}
            {option}
          </button>
        ))}
      </div>
      {customLabel && (
        <div className="flex max-w-md gap-2">
          <Input
            value={draft}
            aria-label={customLabel}
            placeholder={customPlaceholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter adds the entry instead of submitting the whole form.
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addCustom} disabled={!draft.trim()}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

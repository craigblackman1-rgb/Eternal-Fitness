"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IconCheck, IconChevronDown, IconPlus, IconX } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { ProfileOptionCategory } from "@/types";

interface TagMultiSelectProps {
  category: ProfileOptionCategory;
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function TagMultiSelect({ category, selected, onChange, placeholder }: TagMultiSelectProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/profile-options?category=${encodeURIComponent(category)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!cancelled) {
        setOptions((data ?? []).map((row: { value: string }) => row.value));
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [category]);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const remove = (value: string) => onChange(selected.filter((v) => v !== value));

  const addNew = async () => {
    const value = search.trim();
    if (!value) return;
    setOptions((prev) => (prev.includes(value) ? prev : [...prev, value].sort()));
    onChange(selected.includes(value) ? selected : [...selected, value]);
    setSearch("");
    const res = await fetch("/api/profile-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, value }),
    });
    if (res.ok) return;
    const err = await res.json().catch(() => ({ code: "" }));
    if (err.code !== "23505") {
      // 23505 = unique_violation (already exists) — safe to ignore
      console.error("Failed to save new option", err);
    }
  };

  const exactMatch = options.some((o) => o.toLowerCase() === search.trim().toLowerCase());

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <Badge key={value} variant="secondary" className="gap-1 rounded-pill pr-1.5 font-normal">
              {value}
              <button type="button" onClick={() => remove(value)} className="rounded-pill hover:bg-black/10 p-0.5">
                <IconX className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between rounded-lg border-[var(--color-muted-text)] font-normal text-muted-foreground"
          >
            {placeholder ?? "Select or add..."}
            <IconChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search or type to add new..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {search.trim() ? (
                  <button
                    type="button"
                    onClick={addNew}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose hover:bg-[var(--hub-hover)]"
                  >
                    <IconPlus className="h-4 w-4" />
                    Add "{search.trim()}"
                  </button>
                ) : loading ? (
                  "Loading..."
                ) : (
                  "No options yet — type to add one"
                )}
              </CommandEmpty>
              <CommandGroup>
                {options
                  .filter((o) => o.toLowerCase().includes(search.toLowerCase()))
                  .map((option) => (
                    <CommandItem key={option} value={option} onSelect={() => toggle(option)}>
                      <IconCheck className={cn("mr-2 h-4 w-4", selected.includes(option) ? "opacity-100" : "opacity-0")} />
                      {option}
                    </CommandItem>
                  ))}
                {search.trim() && !exactMatch && options.length > 0 && (
                  <CommandItem value={`__add__${search}`} onSelect={addNew} className="text-rose">
                    <IconPlus className="mr-2 h-4 w-4" />
                    Add "{search.trim()}"
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

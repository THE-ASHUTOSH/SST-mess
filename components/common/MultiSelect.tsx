"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface MultiOption {
    value: string;
    label: string;
    color?: string;
}

/**
 * A compact multi-select filter. `selected` is the explicit list of chosen values (the parent seeds
 * it to "all"). Toggling keeps the menu open; All / None reset it. Colour dots let palette-backed
 * filters (meal types, preferences) read at a glance.
 */
export function MultiSelect({
    label,
    options,
    selected,
    onChange,
    className,
}: {
    label: string;
    options: MultiOption[];
    selected: string[];
    onChange: (next: string[]) => void;
    className?: string;
}) {
    const allSelected = options.length > 0 && selected.length === options.length;
    const summary = allSelected ? "All" : selected.length === 0 ? "None" : `${selected.length} selected`;

    const toggle = (value: string) =>
        onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className={cn("h-9 min-w-[150px] justify-between gap-2 font-normal", className)}>
                    <span className="truncate">
                        <span className="text-muted-foreground">{label}:</span> {summary}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
                <div className="flex items-center justify-between px-2 py-1">
                    <DropdownMenuLabel className="p-0 text-xs uppercase tracking-wide text-muted-foreground">{label}</DropdownMenuLabel>
                    <div className="flex items-center gap-1.5 text-xs">
                        <button type="button" onClick={() => onChange(options.map((o) => o.value))} className="text-primary hover:underline">
                            All
                        </button>
                        <span className="text-muted-foreground">·</span>
                        <button type="button" onClick={() => onChange([])} className="text-muted-foreground hover:underline">
                            None
                        </button>
                    </div>
                </div>
                <DropdownMenuSeparator />
                {options.length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-muted-foreground">No options</p>
                ) : (
                    options.map((o) => (
                        <DropdownMenuCheckboxItem
                            key={o.value}
                            checked={selected.includes(o.value)}
                            onCheckedChange={() => toggle(o.value)}
                            onSelect={(e) => e.preventDefault()}
                        >
                            <span className="flex min-w-0 items-center gap-2">
                                {o.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: o.color }} />}
                                <span className="truncate">{o.label}</span>
                            </span>
                        </DropdownMenuCheckboxItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

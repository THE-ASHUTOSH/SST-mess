"use client";

import React, { useEffect, useMemo, useState } from "react";
import axiosInstance from "@/lib/axiosInstance";
import PageHeader from "@/components/common/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Circle,
  CalendarDays,
  // ChevronDown, Sunrise, Sun, Sunset, UtensilsCrossed, // used by the (disabled) meals breakdown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthStat {
  key: string;
  label: string;
  optedIn: boolean;
  vendorName: string | null;
  // Meals breakdown temporarily disabled (see /api/user/meal-history):
  // counts: { breakfast: number; lunch: number; dinner: number };
  // total: number;
}

// Meals breakdown temporarily disabled — re-enable together with the meals query in the API.
// const MEALS = [
//   { key: "breakfast", label: "Breakfast", icon: Sunrise, color: "text-amber-500" },
//   { key: "lunch", label: "Lunch", icon: Sun, color: "text-emerald-500" },
//   { key: "dinner", label: "Dinner", icon: Sunset, color: "text-indigo-500" },
// ] as const;

// A skeleton shaped like a real month row. `delay` offsets the pulse so a list of these
// shimmers in a staggered cascade rather than blinking in unison.
const MonthRowSkeleton = ({ delay }: { delay: number }) => {
  const pulse = { animationDelay: `${delay}ms` };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background/40 px-3 py-3">
      <Skeleton className="h-6 w-6 rounded-full" style={pulse} />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-28 rounded" style={pulse} />
        <Skeleton className="h-3 w-20 rounded" style={pulse} />
      </div>
    </div>
  );
};

const MealHistory = () => {
  const [months, setMonths] = useState<MonthStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Expand/collapse is only needed for the meals breakdown (currently disabled):
  // const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get(`/api/user/meal-history`);
        if (Array.isArray(res.data.months)) setMonths(res.data.months);
      } catch {
        setError("Failed to load your meal history. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // const toggle = (key: string) => {
  //   setOpenKeys((prev) => {
  //     const next = new Set(prev);
  //     if (next.has(key)) next.delete(key);
  //     else next.add(key);
  //     return next;
  //   });
  // };

  const summary = useMemo(() => {
    const optedInMonths = months.filter((m) => m.optedIn).length;
    // const totalMeals = months.reduce((sum, m) => sum + m.total, 0); // meals disabled
    return { optedInMonths };
  }, [months]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Meal History"
        description="The months you've opted in for mess."
      />

      {/* Summary strip */}
      <div className="sm:max-w-[16rem]">
        <div className="app-shell-kpi rounded-2xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span className="text-xs font-medium">Months opted in</span>
          </div>
          {loading ? (
            <Skeleton className="mt-1 h-8 w-10" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-foreground">{summary.optedInMonths}</p>
          )}
        </div>
        {/* Total-meals tile disabled with the meals breakdown. */}
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-3 sm:p-4">
          {loading ? (
            <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="Loading meal history">
              {[0, 1, 2, 3, 4].map((i) => (
                <MonthRowSkeleton key={i} delay={i * 120} />
              ))}
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-destructive">{error}</p>
          ) : months.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                No opted-in months yet. Once you&apos;re opted in for a month, it&apos;ll show up here.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {months.map((m) => (
                <li key={m.key}>
                  <div
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-3",
                      m.optedIn
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-border bg-background/40",
                    )}
                  >
                    {/* Opt-in check */}
                    {m.optedIn ? (
                      <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="h-6 w-6 shrink-0 text-muted-foreground/50" />
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{m.label}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.optedIn
                          ? m.vendorName
                            ? `Opted in · ${m.vendorName}`
                            : "Opted in"
                          : "Not opted in"}
                      </p>
                    </div>

                    {/* Meals breakdown (pill + chevron + expandable counts) temporarily disabled:
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {m.total} {m.total === 1 ? "meal" : "meals"}
                    </span>
                    <ChevronDown ... /> */}
                  </div>

                  {/* Expandable per-meal counts temporarily disabled:
                  {open && (
                    <div className="mt-2 grid grid-cols-3 gap-2 px-1">
                      {MEALS.map((meal) => { ... })}
                    </div>
                  )} */}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MealHistory;

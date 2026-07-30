"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Moon, Pencil, Sun, Sunrise, Utensils, X, Check, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const MEALS = [
  { key: "breakfast", label: "Breakfast", icon: Sunrise, accent: "text-warning", tint: "bg-warning/10" },
  { key: "lunch", label: "Lunch", icon: Sun, accent: "text-primary", tint: "bg-primary/10" },
  { key: "dinner", label: "Dinner", icon: Moon, accent: "text-success", tint: "bg-success/10" },
] as const;
type MealKey = (typeof MEALS)[number]["key"];

interface MenuDay {
  date: string;
  breakfast: string[];
  lunch: string[];
  dinner: string[];
  isSet: boolean;
}
interface MenuVendor {
  id: string; name: string;
  breakfast: boolean | null; lunch: boolean | null; dinner: boolean | null;
}
interface MenuDayScrollerProps {
  vendorId: string;
  /** Admin view shows a per-day Edit button; the student view is read-only. */
  editable?: boolean;
}

const errMessage = (err: unknown, fallback: string): string => {
  if (typeof err === "object" && err !== null && "response" in err) {
    const m = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (m) return m;
  }
  return fallback;
};

/** "2026-07-30" → { weekday: "Thursday", day: "30", month: "Jul" }. Parsed as parts, never `new
 *  Date(str)`, so the label can't slip a day depending on the reader's timezone. */
function formatDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    weekday: dt.toLocaleDateString("en-US", { weekday: "long" }),
    weekdayShort: dt.toLocaleDateString("en-US", { weekday: "short" }),
    day: String(d).padStart(2, "0"),
    month: dt.toLocaleDateString("en-US", { month: "short" }),
  };
}

export default function MenuDayScroller({ vendorId, editable = false }: MenuDayScrollerProps) {
  const [vendor, setVendor] = useState<MenuVendor | null>(null);
  const [days, setDays] = useState<MenuDay[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<MealKey, string>>({ breakfast: "", lunch: "", dinner: "" });
  const [isSaving, setIsSaving] = useState(false);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const servedMeals = MEALS.filter((m) => vendor?.[m.key] !== false);

  useEffect(() => {
    if (!vendorId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setEditingDate(null);
      try {
        const res = await axiosInstance.get(`/api/vendor/menu`, { params: { vendorId } });
        if (cancelled) return;
        setVendor(res.data.vendor);
        setDays(Array.isArray(res.data.days) ? res.data.days : []);
      } catch (err) {
        if (!cancelled) toast.error(errMessage(err, "Failed to load the menu."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [vendorId]);

  // Track scroll position so the arrows can disable at the ends.
  const syncEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    syncEdges();
  }, [days, syncEdges]);

  /** Scroll exactly one card, measured from the DOM so it stays correct at any breakpoint. */
  const scrollByCard = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-menu-card]");
    const gap = 16;
    const step = card ? card.offsetWidth + gap : el.clientWidth;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  const startEdit = (day: MenuDay) => {
    setEditingDate(day.date);
    setDraft({
      breakfast: day.breakfast.join("\n"),
      lunch: day.lunch.join("\n"),
      dinner: day.dinner.join("\n"),
    });
  };

  const saveDay = async (date: string) => {
    setIsSaving(true);
    try {
      const toList = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
      const res = await axiosInstance.put(`/api/vendor/menu?vendorId=${vendorId}`, {
        date,
        breakfast: toList(draft.breakfast),
        lunch: toList(draft.lunch),
        dinner: toList(draft.dinner),
      });
      const saved = res.data.day as MenuDay;
      setDays((prev) => prev.map((d) => (d.date === date ? { ...d, ...saved } : d)));
      setEditingDate(null);
      toast.success(`Menu saved for ${formatDate(date).weekday}.`);
    } catch (err) {
      toast.error(errMessage(err, "Failed to save the menu."));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-80 w-[280px] shrink-0 rounded-2xl" />)}
      </div>
    );
  }

  if (!days.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <Utensils className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No menu days available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {days.length} days · {days[0].date} to {days[days.length - 1].date}
          {editable && " · today onwards is editable"}
        </p>
        <div className="flex gap-1.5">
          <Button variant="outline" size="icon-sm" aria-label="Previous day"
            onClick={() => scrollByCard(-1)} disabled={atStart}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Next day"
            onClick={() => scrollByCard(1)} disabled={atEnd}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={trackRef}
        onScroll={syncEdges}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:thin]"
      >
        {days.map((day, index) => {
          const d = formatDate(day.date);
          const isToday = index === 0;
          const isEditing = editingDate === day.date;
          const totalDishes = servedMeals.reduce((n, m) => n + day[m.key].length, 0);

          return (
            <div
              key={day.date}
              data-menu-card
              className={cn(
                "w-[280px] shrink-0 snap-start rounded-2xl border transition-colors sm:w-[300px]",
                isToday ? "border-primary/40 bg-primary/[0.04]" : "border-border bg-card",
                isEditing && "border-primary ring-2 ring-primary/20",
              )}
            >
              {/* Date header — the day is stated above the meals, as asked. */}
              <div className="flex items-start justify-between gap-2 border-b border-border/70 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{d.weekday}</span>
                    {isToday && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                        Today
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {d.day} {d.month} · {totalDishes} {totalDishes === 1 ? "dish" : "dishes"}
                  </p>
                </div>

                {editable && !isEditing && (
                  <Button variant="ghost" size="icon-sm" aria-label={`Edit ${d.weekday}`}
                    onClick={() => startEdit(day)} className="shrink-0 text-primary hover:bg-primary/10">
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-3 p-4">
                {servedMeals.map(({ key, label, icon: Icon, accent, tint }) => (
                  <div key={key} className="rounded-xl border border-border/70 bg-background/40 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-lg", tint)}>
                        <Icon className={cn("h-3.5 w-3.5", accent)} aria-hidden />
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {label}
                      </span>
                    </div>

                    {isEditing ? (
                      <Textarea
                        value={draft[key]}
                        onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
                        placeholder={"One dish per line…"}
                        rows={4}
                        disabled={isSaving}
                        className="min-h-20 text-sm"
                      />
                    ) : day[key].length ? (
                      <ul className="space-y-1">
                        {day[key].map((dish, i) => (
                          <li key={`${dish}-${i}`} className="flex gap-1.5 text-sm leading-snug text-foreground">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                            <span>{dish}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">
                        {editable ? "Not set — tap the pencil to add dishes." : "Not published yet."}
                      </p>
                    )}
                  </div>
                ))}

                {isEditing && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1" onClick={() => saveDay(day.date)} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      {isSaving ? "Saving…" : "Save"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingDate(null)} disabled={isSaving}>
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

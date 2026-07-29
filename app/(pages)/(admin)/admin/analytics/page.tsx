"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { isAxiosError } from "axios";
import { CalendarRange, RotateCcw, TrendingUp, Users, UtensilsCrossed, Store, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/common/layout/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/context/UserContext";
import { MultiSelect } from "@/components/common/MultiSelect";
import { ChartCard, VendorOptInChart, MealsByVendorChart, PreferenceDonut, TrendAreaChart } from "./Charts";
import { BillingPanel } from "./BillingPanel";
import {
    MEAL_META,
    PREF_META,
    MONTHS,
    fmt,
    emptyPrefs,
    type AnalyticsSummary,
    type MealType,
    type PrefKey,
} from "./constants";

const ALL_MEALS: MealType[] = ["breakfast", "lunch", "dinner"];
const ALL_PREFS: PrefKey[] = ["vegetarian", "nonVegetarian", "eggetarian"];
const now = new Date();

function Kpi({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string; sub?: string }) {
    return (
        <div className="app-shell-kpi flex items-start gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
                <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
                {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
            </div>
        </div>
    );
}

export default function AnalyticsPage() {
    const { user } = useUser();

    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selVendors, setSelVendors] = useState<string[]>([]);
    const [selMeals, setSelMeals] = useState<MealType[]>(ALL_MEALS);
    const [selPrefs, setSelPrefs] = useState<PrefKey[]>(ALL_PREFS);
    const vendorKeyRef = useRef("");

    const load = useCallback(async (m: number, y: number) => {
        setLoading(true);
        setError(null);
        try {
            const res = await axiosInstance.post("/api/admin/analytics/summary", { month: m, year: y });
            setSummary(res.data as AnalyticsSummary);
        } catch (err: unknown) {
            const msg = isAxiosError(err) && err.response?.data?.message ? err.response.data.message : "Failed to load analytics.";
            setError(msg);
            setSummary(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load(month, year);
    }, [month, year, load]);

    // Seed the vendor filter to "all" the first time (and if the vendor set changes); keep the
    // user's meal-type / preference choices across month changes.
    useEffect(() => {
        if (!summary) return;
        const key = summary.vendors.map((v) => v.id).sort().join(",");
        if (key !== vendorKeyRef.current) {
            vendorKeyRef.current = key;
            setSelVendors(summary.vendors.map((v) => v.id));
        }
    }, [summary]);

    const resetFilters = () => {
        setMonth(now.getMonth() + 1);
        setYear(now.getFullYear());
        setSelVendors(summary ? summary.vendors.map((v) => v.id) : []);
        setSelMeals(ALL_MEALS);
        setSelPrefs(ALL_PREFS);
    };

    const derived = useMemo(() => {
        if (!summary) return null;
        const vendorSet = new Set(selVendors);
        const mealTotal = <T extends Record<MealType, number>>(r: T) => selMeals.reduce((s, k) => s + r[k], 0);

        // Demand — opt-ins per vendor (filtered by vendor + preference)
        const optInData = summary.optInByVendor
            .filter((v) => vendorSet.has(v.vendorId))
            .map((v) => ({ name: v.vendorName, value: selPrefs.reduce((s, p) => s + v.preferences[p], 0) }))
            .filter((v) => v.value > 0)
            .sort((a, b) => b.value - a.value);

        // Preference totals over the selected vendors
        const prefTotals = emptyPrefs();
        for (const v of summary.optInByVendor) {
            if (!vendorSet.has(v.vendorId)) continue;
            for (const p of ALL_PREFS) prefTotals[p] += v.preferences[p];
        }
        const prefData = PREF_META.filter((p) => selPrefs.includes(p.key)).map((p) => ({
            key: p.key,
            label: p.label,
            value: prefTotals[p.key],
            color: p.color,
        }));

        // Consumption — meals by vendor (filtered by vendor; meal-type cols handled in components)
        const mealsVendors = summary.mealsByVendor.filter((v) => vendorSet.has(v.vendorId));
        const mealsByVendorData = mealsVendors
            .map((v) => ({ name: v.vendorName, breakfast: v.breakfast, lunch: v.lunch, dinner: v.dinner }))
            .filter((v) => mealTotal(v) > 0)
            .sort((a, b) => mealTotal(b) - mealTotal(a));

        const mealTypeTotals = summary.mealsByType;

        // KPIs
        const totalOptIns = optInData.reduce((s, d) => s + d.value, 0);
        const mealsServed = mealsVendors.reduce((s, v) => s + mealTotal(v), 0);
        const vendorsShown = selVendors.length;
        const avg = totalOptIns > 0 ? mealsServed / totalOptIns : 0;

        return {
            optInData,
            prefData,
            mealsByVendorData,
            trend: summary.dailyTrend,
            mealTypeTotals,
            kpi: { totalOptIns, mealsServed, vendorsShown, avg },
        };
    }, [summary, selVendors, selMeals, selPrefs]);

    // ---- Access guard (cosmetic; the API is the real superAdmin boundary) ----
    if (user && user.role !== "superAdmin") {
        return (
            <div className="flex flex-col gap-4">
                <PageHeader title="Analytics" description="Vendor demand and meals served." />
                <Card className="border-border bg-card">
                    <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                        <p className="font-medium text-foreground">Restricted to super admins</p>
                        <p className="text-sm text-muted-foreground">You don&apos;t have access to this dashboard.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);
    const vendorOptions = summary?.vendors.map((v) => ({ value: v.id, label: v.name })) ?? [];

    return (
        <div className="flex flex-col gap-4">
            <PageHeader title="Analytics" description="Vendor demand and meals served, in one dashboard." />

            {/* Filter bar */}
            <div className="theme-section flex flex-wrap items-center gap-2">
                <span className="mr-1 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <CalendarRange className="h-4 w-4" /> Month
                </span>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {MONTHS.map((m, i) => (
                            <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                    <SelectTrigger className="h-9 w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {years.map((y) => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <span className="mx-1 h-6 w-px bg-border" />

                <MultiSelect label="Vendors" options={vendorOptions} selected={selVendors} onChange={setSelVendors} />
                <MultiSelect
                    label="Meals"
                    options={MEAL_META.map((m) => ({ value: m.key, label: m.label, color: m.color }))}
                    selected={selMeals}
                    onChange={(v) => setSelMeals(v as MealType[])}
                />
                <MultiSelect
                    label="Preference"
                    options={PREF_META.map((p) => ({ value: p.key, label: p.label, color: p.color }))}
                    selected={selPrefs}
                    onChange={(v) => setSelPrefs(v as PrefKey[])}
                />

                <Button variant="ghost" size="sm" onClick={resetFilters} className="ml-auto gap-1.5 text-muted-foreground">
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
            </div>

            {error ? (
                <Card className="border-border bg-card">
                    <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                        <p className="font-medium text-foreground">{error}</p>
                        <Button variant="outline" onClick={() => load(month, year)}>Retry</Button>
                    </CardContent>
                </Card>
            ) : loading || !derived ? (
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
                    </div>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Skeleton className="h-80 w-full rounded-xl" />
                        <Skeleton className="h-80 w-full rounded-xl" />
                    </div>
                    <Skeleton className="h-80 w-full rounded-xl" />
                </div>
            ) : (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Kpi icon={Users} label="Opted-in students" value={fmt(derived.kpi.totalOptIns)} sub={`${MONTHS[month - 1]} ${year}`} />
                        <Kpi icon={UtensilsCrossed} label="Meals served" value={fmt(derived.kpi.mealsServed)} sub="by opted-in students" />
                        <Kpi icon={Store} label="Vendors in view" value={fmt(derived.kpi.vendorsShown)} sub={`of ${fmt(summary?.totals.activeVendors ?? 0)} active`} />
                        <Kpi icon={TrendingUp} label="Avg meals / student" value={derived.kpi.avg.toFixed(1)} sub="served ÷ opted-in" />
                    </div>

                    {/* Demand */}
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demand · opt-ins</p>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <ChartCard
                            title="Vendor popularity"
                            subtitle="Students opted in, per vendor"
                            isEmpty={derived.optInData.length === 0}
                            table={{ headers: ["Vendor", "Opt-ins"], rows: derived.optInData.map((d) => [d.name, d.value]) }}
                        >
                            <VendorOptInChart data={derived.optInData} />
                        </ChartCard>
                        <ChartCard
                            title="Preference split"
                            subtitle="Veg / Non-veg / Egg across selected vendors"
                            isEmpty={derived.prefData.every((d) => d.value === 0)}
                            table={{ headers: ["Preference", "Opt-ins"], rows: derived.prefData.map((d) => [d.label, d.value]) }}
                        >
                            <PreferenceDonut data={derived.prefData} />
                        </ChartCard>
                    </div>

                    {/* Consumption */}
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Consumption · meals served</p>
                        <div className="flex flex-wrap items-center gap-3">
                            {MEAL_META.filter((m) => selMeals.includes(m.key)).map((m) => (
                                <span key={m.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />
                                    {m.label}
                                    <span className="font-semibold tabular-nums text-foreground">{fmt(derived.mealTypeTotals[m.key])}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <ChartCard
                            title="Meals by vendor"
                            subtitle="Served meals, stacked by meal type"
                            isEmpty={derived.mealsByVendorData.length === 0}
                            table={{
                                headers: ["Vendor", ...MEAL_META.filter((m) => selMeals.includes(m.key)).map((m) => m.label)],
                                rows: derived.mealsByVendorData.map((d) => [d.name, ...MEAL_META.filter((m) => selMeals.includes(m.key)).map((m) => d[m.key])]),
                            }}
                        >
                            <MealsByVendorChart data={derived.mealsByVendorData} mealTypes={selMeals} />
                        </ChartCard>
                        <ChartCard
                            title="Daily trend"
                            subtitle="Meals served per day (all vendors)"
                            isEmpty={derived.trend.length === 0}
                            table={{
                                headers: ["Date", ...MEAL_META.filter((m) => selMeals.includes(m.key)).map((m) => m.label)],
                                rows: derived.trend.map((d) => [d.day, ...MEAL_META.filter((m) => selMeals.includes(m.key)).map((m) => d[m.key])]),
                            }}
                        >
                            <TrendAreaChart data={derived.trend} mealTypes={selMeals} />
                        </ChartCard>
                    </div>

                    {/* Billing */}
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Billing</p>
                    <BillingPanel vendors={summary?.vendors ?? []} mealsByVendor={summary?.mealsByVendor.filter((v) => selVendors.includes(v.vendorId)) ?? []} mealTypes={selMeals} />
                </>
            )}
        </div>
    );
}

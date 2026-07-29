"use client";

import React, { useState } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MEAL_META, fmt, type MealType, type MealVendor, type VendorRef } from "./constants";

type Period = "daily" | "weekly" | "monthly";

/* --- date helpers (ported from the old Total Meals page) --- */
function weekInputToDate(weekStr: string): string {
    const [yearStr, weekPart] = weekStr.split("-W");
    const year = Number(yearStr);
    const week = Number(weekPart);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const dayOfWeek = jan4.getUTCDay() || 7;
    jan4.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
    return jan4.toISOString().split("T")[0];
}
function getDefaultDateValue(period: Period): string {
    const now = new Date();
    if (period === "daily") return now.toISOString().split("T")[0];
    if (period === "weekly") {
        const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
        return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
    }
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
function buildSubtitle(period: Period, resolvedDate: string, vendorName: string, mealName: string): string {
    const parts = [vendorName, mealName];
    if (period === "daily") {
        parts.push(new Date(resolvedDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }));
    } else if (period === "weekly") {
        const start = new Date(resolvedDate + "T00:00:00");
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        parts.push(
            `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
        );
    } else {
        parts.push(new Date(resolvedDate + "T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" }));
    }
    return parts.join(" · ");
}

/* ------------------------------------------------------------------ */
/* Exact billing calculator (authoritative count via /api/meal/total-meals) */
/* ------------------------------------------------------------------ */

function ExactCalculator({ vendors }: { vendors: VendorRef[] }) {
    const [period, setPeriod] = useState<Period>("daily");
    const [dateValue, setDateValue] = useState<string>(getDefaultDateValue("daily"));
    const [vendorId, setVendorId] = useState<string>("all");
    const [mealType, setMealType] = useState<string>("all");
    const [count, setCount] = useState<number | null>(null);
    const [subtitle, setSubtitle] = useState("");
    const [loading, setLoading] = useState(false);

    const changePeriod = (p: Period) => {
        setPeriod(p);
        setDateValue(getDefaultDateValue(p));
        setCount(null);
    };

    const calculate = async () => {
        if (!dateValue || !vendorId || !mealType) {
            toast.error("Please fill all fields.");
            return;
        }
        const resolvedDate = period === "weekly" ? weekInputToDate(dateValue) : period === "monthly" ? `${dateValue}-01` : dateValue;
        setLoading(true);
        setCount(null);
        try {
            const res = await axiosInstance.post("/api/meal/total-meals", { date: resolvedDate, vendorId, mealType, period });
            if (res.data.success) {
                setCount(res.data.count);
                const vName = vendorId === "all" ? "All Vendors" : vendors.find((v) => v.id === vendorId)?.name ?? vendorId;
                const mName = mealType === "all" ? "All Meals" : mealType.charAt(0).toUpperCase() + mealType.slice(1);
                setSubtitle(buildSubtitle(period, resolvedDate, vName, mName));
            } else {
                toast.error(res.data.message || "Failed to calculate.");
            }
        } catch (err: unknown) {
            const msg = isAxiosError(err) && err.response?.data?.message ? err.response.data.message : "Failed to calculate.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-card-foreground">Billing calculator</CardTitle>
                <p className="text-xs text-muted-foreground">Exact served-meal count for any vendor, period and meal type.</p>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs">Period</Label>
                        <Select value={period} onValueChange={(v) => changePeriod(v as Period)}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">{period === "daily" ? "Date" : period === "weekly" ? "Week" : "Month"}</Label>
                        <Input
                            type={period === "daily" ? "date" : period === "weekly" ? "week" : "month"}
                            value={dateValue}
                            onChange={(e) => setDateValue(e.target.value)}
                            className="h-9"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Vendor</Label>
                        <Select value={vendorId} onValueChange={setVendorId}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Vendors</SelectItem>
                                {vendors.map((v) => (
                                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Meal type</Label>
                        <Select value={mealType} onValueChange={setMealType}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Meals</SelectItem>
                                <SelectItem value="breakfast">Breakfast</SelectItem>
                                <SelectItem value="lunch">Lunch</SelectItem>
                                <SelectItem value="dinner">Dinner</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Button onClick={calculate} disabled={loading} className="w-full">
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Calculating…</> : "Calculate"}
                </Button>
                {count !== null && (
                    <div className="rounded-xl bg-primary/10 p-4 text-center text-primary animate-in fade-in slide-in-from-bottom-1">
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Meals recorded</p>
                        <p className="text-4xl font-extrabold tabular-nums">{fmt(count)}</p>
                        <p className="mt-1 text-xs opacity-60">{subtitle}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/* ------------------------------------------------------------------ */
/* Per-vendor × meal-type breakdown table (from the month summary)     */
/* ------------------------------------------------------------------ */

function BreakdownTable({ rows, mealTypes }: { rows: MealVendor[]; mealTypes: MealType[] }) {
    const shown = MEAL_META.filter((m) => mealTypes.includes(m.key));
    const rowTotal = (r: MealVendor) => shown.reduce((s, m) => s + r[m.key], 0);
    const colTotal = (k: MealType) => rows.reduce((s, r) => s + r[k], 0);
    const grand = rows.reduce((s, r) => s + rowTotal(r), 0);

    return (
        <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-card-foreground">Served meals by vendor</CardTitle>
                <p className="text-xs text-muted-foreground">Attributed to each vendor via that month&apos;s opt-ins.</p>
            </CardHeader>
            <CardContent>
                {rows.length === 0 ? (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No served meals for this selection.</div>
                ) : (
                    <div className="max-h-80 overflow-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Vendor</th>
                                    {shown.map((m) => (
                                        <th key={m.key} className="px-3 py-2 text-right font-medium text-muted-foreground">
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="h-2 w-2 rounded-sm" style={{ background: m.color }} />
                                                {m.label}
                                            </span>
                                        </th>
                                    ))}
                                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {rows.map((r) => (
                                    <tr key={r.vendorId} className="hover:bg-muted/40">
                                        <td className="px-3 py-2 text-left text-foreground">{r.vendorName}</td>
                                        {shown.map((m) => (
                                            <td key={m.key} className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(r[m.key])}</td>
                                        ))}
                                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-foreground">{fmt(rowTotal(r))}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="sticky bottom-0 border-t border-border bg-muted/60 backdrop-blur">
                                <tr>
                                    <td className="px-3 py-2 text-left font-semibold text-foreground">All vendors</td>
                                    {shown.map((m) => (
                                        <td key={m.key} className="px-3 py-2 text-right font-medium tabular-nums text-foreground">{fmt(colTotal(m.key))}</td>
                                    ))}
                                    <td className="px-3 py-2 text-right font-bold tabular-nums text-foreground">{fmt(grand)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function BillingPanel({ vendors, mealsByVendor, mealTypes }: { vendors: VendorRef[]; mealsByVendor: MealVendor[]; mealTypes: MealType[] }) {
    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ExactCalculator vendors={vendors} />
            <BreakdownTable rows={mealsByVendor} mealTypes={mealTypes} />
        </div>
    );
}

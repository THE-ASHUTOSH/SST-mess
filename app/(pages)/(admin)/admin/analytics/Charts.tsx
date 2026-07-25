"use client";

import React, { useState } from "react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    LabelList,
    PieChart,
    Pie,
    Cell,
    Label,
    AreaChart,
    Area,
} from "recharts";
import { BarChart3, Table2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MEAL_META, PREF_META, SERIES_PRIMARY, fmt, type MealType, type PrefKey } from "./constants";

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 } as const;
const GRID = { stroke: "var(--border)", strokeOpacity: 0.6 } as const;

interface TooltipEntry {
    name?: string;
    value?: number;
    color?: string;
    fill?: string;
    dataKey?: string | number;
}
interface ChartTooltipProps {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string | number;
    labelFormatter?: (label: string | number) => string;
    showTotal?: boolean;
}

function ChartTooltip({ active, payload, label, labelFormatter, showTotal }: ChartTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;
    const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
    return (
        <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
            {label != null && (
                <p className="mb-1.5 font-medium text-popover-foreground">{labelFormatter ? labelFormatter(label) : String(label)}</p>
            )}
            <div className="space-y-1">
                {payload.map((p, i) => (
                    <div key={`${p.dataKey}-${i}`} className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color ?? p.fill }} />
                        <span className="text-muted-foreground">{p.name}</span>
                        <span className="ml-auto pl-4 font-medium tabular-nums text-popover-foreground">{fmt(p.value)}</span>
                    </div>
                ))}
                {showTotal && payload.length > 1 && (
                    <div className="mt-1 flex items-center gap-2 border-t border-border pt-1">
                        <span className="text-muted-foreground">Total</span>
                        <span className="ml-auto font-semibold tabular-nums text-popover-foreground">{fmt(total)}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
    return (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
            {items.map((it) => (
                <span key={it.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: it.color }} />
                    {it.label}
                </span>
            ))}
        </div>
    );
}

/**
 * Card wrapper for every chart. When `table` is supplied it exposes a chart/table toggle — the
 * table view is the accessibility fallback (identity never by colour alone) required by the method.
 */
export function ChartCard({
    title,
    subtitle,
    isEmpty,
    emptyText = "No data for this selection.",
    table,
    children,
    className = "",
}: {
    title: string;
    subtitle?: string;
    isEmpty?: boolean;
    emptyText?: string;
    table?: { headers: string[]; rows: (string | number)[][] };
    children: React.ReactNode;
    className?: string;
}) {
    const [view, setView] = useState<"chart" | "table">("chart");
    return (
        <Card className={`border-border bg-card shadow-sm ${className}`}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-1">
                <div className="min-w-0">
                    <CardTitle className="text-base font-semibold text-card-foreground">{title}</CardTitle>
                    {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
                </div>
                {table && !isEmpty && (
                    <button
                        type="button"
                        onClick={() => setView((v) => (v === "chart" ? "table" : "chart"))}
                        className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        aria-label={view === "chart" ? "Show data table" : "Show chart"}
                    >
                        {view === "chart" ? <Table2 className="h-3.5 w-3.5" /> : <BarChart3 className="h-3.5 w-3.5" />}
                        {view === "chart" ? "Table" : "Chart"}
                    </button>
                )}
            </CardHeader>
            <CardContent className="pt-2">
                {isEmpty ? (
                    <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">{emptyText}</div>
                ) : view === "table" && table ? (
                    <DataTable headers={table.headers} rows={table.rows} />
                ) : (
                    children
                )}
            </CardContent>
        </Card>
    );
}

function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
    return (
        <div className="max-h-72 overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                    <tr>
                        {headers.map((h, i) => (
                            <th key={h} className={`px-3 py-2 font-medium text-muted-foreground ${i === 0 ? "text-left" : "text-right"}`}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {rows.map((r, ri) => (
                        <tr key={ri} className="hover:bg-muted/40">
                            {r.map((c, ci) => (
                                <td
                                    key={ci}
                                    className={`px-3 py-2 ${ci === 0 ? "text-left text-foreground" : "text-right tabular-nums text-muted-foreground"}`}
                                >
                                    {typeof c === "number" ? fmt(c) : c}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* 1. Vendor popularity — opt-ins per vendor (single-hue horizontal bar) */
/* ------------------------------------------------------------------ */

export function VendorOptInChart({ data }: { data: { name: string; value: number }[] }) {
    const height = Math.min(420, Math.max(160, data.length * 44));
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart layout="vertical" data={data} margin={{ top: 4, right: 40, bottom: 4, left: 8 }}>
                <CartesianGrid horizontal={false} {...GRID} />
                <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={130} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ChartTooltip />} />
                <Bar dataKey="value" name="Opt-ins" fill={SERIES_PRIMARY} radius={[0, 4, 4, 0]} maxBarSize={26}>
                    <LabelList dataKey="value" position="right" fill="var(--foreground)" fontSize={12} formatter={(v) => fmt(Number(v))} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

/* ------------------------------------------------------------------ */
/* 2. Meals served by vendor — stacked horizontal bar (by meal type)   */
/* ------------------------------------------------------------------ */

export function MealsByVendorChart({
    data,
    mealTypes,
}: {
    data: { name: string; breakfast: number; lunch: number; dinner: number }[];
    mealTypes: MealType[];
}) {
    const shown = MEAL_META.filter((m) => mealTypes.includes(m.key));
    const height = Math.min(420, Math.max(160, data.length * 44));
    return (
        <>
            <ResponsiveContainer width="100%" height={height}>
                <BarChart layout="vertical" data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                    <CartesianGrid horizontal={false} {...GRID} />
                    <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={130} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ChartTooltip showTotal />} />
                    {shown.map((m, i) => (
                        <Bar
                            key={m.key}
                            dataKey={m.key}
                            name={m.label}
                            stackId="s"
                            fill={m.color}
                            stroke="var(--card)"
                            strokeWidth={2}
                            radius={i === shown.length - 1 ? [0, 4, 4, 0] : 0}
                            maxBarSize={28}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
            <ChartLegend items={shown.map((m) => ({ label: m.label, color: m.color }))} />
        </>
    );
}

/* ------------------------------------------------------------------ */
/* 3. Preference split — donut with centre total + direct % labels     */
/* ------------------------------------------------------------------ */

export function PreferenceDonut({ data }: { data: { key: PrefKey; label: string; value: number; color: string }[] }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    return (
        <>
            <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={64}
                        outerRadius={98}
                        paddingAngle={2}
                        stroke="var(--card)"
                        strokeWidth={2}
                        labelLine={false}
                        label={({ percent }) =>
                            typeof percent === "number" && percent >= 0.06 ? `${Math.round(percent * 100)}%` : ""
                        }
                    >
                        {data.map((d) => (
                            <Cell key={d.key} fill={d.color} />
                        ))}
                        <Label
                            position="center"
                            content={({ viewBox }) => {
                                const vb = viewBox as { cx?: number; cy?: number } | undefined;
                                if (!vb?.cx || !vb?.cy) return null;
                                return (
                                    <text x={vb.cx} y={vb.cy} textAnchor="middle" dominantBaseline="central">
                                        <tspan x={vb.cx} dy="-0.3em" className="fill-foreground" fontSize={24} fontWeight={700}>
                                            {fmt(total)}
                                        </tspan>
                                        <tspan x={vb.cx} dy="1.5em" className="fill-muted-foreground" fontSize={12}>
                                            opt-ins
                                        </tspan>
                                    </text>
                                );
                            }}
                        />
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                </PieChart>
            </ResponsiveContainer>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
                {data.map((d) => (
                    <span key={d.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
                        {d.label}
                        <span className="font-medium tabular-nums text-foreground">
                            {fmt(d.value)}
                            {total > 0 ? ` (${Math.round((d.value / total) * 100)}%)` : ""}
                        </span>
                    </span>
                ))}
            </div>
        </>
    );
}

/* ------------------------------------------------------------------ */
/* 4. Served-meals trend — stacked area over the days of the month     */
/* ------------------------------------------------------------------ */

export function TrendAreaChart({ data, mealTypes }: { data: { day: string; breakfast: number; lunch: number; dinner: number }[]; mealTypes: MealType[] }) {
    const shown = MEAL_META.filter((m) => mealTypes.includes(m.key));
    const dayNum = (d: string) => String(Number(d.slice(8, 10)));
    const fullDate = (d: string | number) =>
        new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    return (
        <>
            <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
                    <defs>
                        {shown.map((m) => (
                            <linearGradient key={m.key} id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={m.color} stopOpacity={0.35} />
                                <stop offset="100%" stopColor={m.color} stopOpacity={0.03} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid vertical={false} {...GRID} />
                    <XAxis dataKey="day" tickFormatter={dayNum} tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={16} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                    <Tooltip
                        cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.4 }}
                        content={<ChartTooltip showTotal labelFormatter={fullDate} />}
                    />
                    {shown.map((m) => (
                        <Area
                            key={m.key}
                            type="monotone"
                            dataKey={m.key}
                            name={m.label}
                            stackId="1"
                            stroke={m.color}
                            strokeWidth={2}
                            fill={`url(#grad-${m.key})`}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
            <ChartLegend items={shown.map((m) => ({ label: m.label, color: m.color }))} />
        </>
    );
}

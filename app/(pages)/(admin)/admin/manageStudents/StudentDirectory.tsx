"use client";

import React, { useEffect, useMemo, useState } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { toast } from "sonner";
import {
    ChevronLeft, ChevronRight, MoreHorizontal, Pencil, RotateCcw, Search, Store,
    Trash2, UtensilsCrossed,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MultiSelect } from "@/components/common/MultiSelect";
import { ChangeVendorDialog, DeleteSelectionDialog, MealDetailsDialog } from "./StudentDialogs";
import type { FilterOptions, StudentRow } from "./types";

const PAGE_SIZES = [25, 50, 100];

const currentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (m: string) => {
    const [y, mo] = m.split("-").map(Number);
    if (!y || !mo) return m;
    return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
};
const fmt = (n: number) => n.toLocaleString("en-IN");
const errMessage = (err: unknown, fallback: string): string => {
    if (typeof err === "object" && err !== null && "response" in err) {
        const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
        if (msg) return msg;
    }
    return fallback;
};

export function StudentDirectory() {
    const [month, setMonth] = useState(currentMonth());
    const [search, setSearch] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [optedIn, setOptedIn] = useState<"all" | "yes" | "no">("all");

    const [options, setOptions] = useState<FilterOptions | null>(null);
    const [selVendors, setSelVendors] = useState<string[]>([]);
    const [selBatches, setSelBatches] = useState<string[]>([]);
    const [selHostels, setSelHostels] = useState<string[]>([]);
    const [selPrefs, setSelPrefs] = useState<string[]>([]);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const [students, setStudents] = useState<StudentRow[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    // Dialog targets
    const [changeTarget, setChangeTarget] = useState<StudentRow | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<StudentRow | null>(null);
    const [mealsTarget, setMealsTarget] = useState<{ id: string; name: string; email: string } | null>(null);

    // Load filter options once, seed multi-selects to "all".
    useEffect(() => {
        axiosInstance
            .get("/api/admin/students/filters")
            .then((res) => {
                const opts = res.data as FilterOptions;
                setOptions(opts);
                setSelVendors(opts.vendors.map((v) => v.id));
                setSelBatches(opts.batches);
                setSelHostels(opts.hostels);
                setSelPrefs(opts.preferences);
            })
            .catch(() => toast.error("Failed to load filters."));
    }, []);

    // Debounce the search box; any search change returns to page 1.
    useEffect(() => {
        const t = setTimeout(() => {
            setSearchQuery(search);
            setPage(1);
        }, 350);
        return () => clearTimeout(t);
    }, [search]);

    // Fetch the page whenever any query input changes.
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        const params: Record<string, string> = { month, page: String(page), pageSize: String(pageSize) };
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (optedIn !== "all") params.optedIn = optedIn;
        // Send a filter only when it's a proper subset — "all" (or empty) means no constraint.
        const subset = (sel: string[], all: number) => sel.length > 0 && sel.length < all;
        if (options) {
            if (subset(selVendors, options.vendors.length)) params.vendorIds = selVendors.join(",");
            if (subset(selBatches, options.batches.length)) params.batches = selBatches.join(",");
            if (subset(selHostels, options.hostels.length)) params.hostels = selHostels.join(",");
            if (subset(selPrefs, options.preferences.length)) params.preferences = selPrefs.join(",");
        }

        axiosInstance
            .get("/api/admin/students", { params })
            .then((res) => {
                if (cancelled) return;
                setStudents(res.data.students ?? []);
                setTotal(res.data.total ?? 0);
                setTotalPages(res.data.totalPages ?? 1);
            })
            .catch((err) => {
                if (!cancelled) setError(errMessage(err, "Failed to load students."));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [month, searchQuery, optedIn, selVendors, selBatches, selHostels, selPrefs, page, pageSize, options, reloadKey]);

    const resetFilters = () => {
        setMonth(currentMonth());
        setSearch("");
        setOptedIn("all");
        if (options) {
            setSelVendors(options.vendors.map((v) => v.id));
            setSelBatches(options.batches);
            setSelHostels(options.hostels);
            setSelPrefs(options.preferences);
        }
        setPage(1);
    };

    // When a filter changes, jump back to page 1.
    const withReset = <T,>(setter: (v: T) => void) => (v: T) => {
        setter(v);
        setPage(1);
    };

    const label = monthLabel(month);
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    const vendorOptions = useMemo(() => options?.vendors.map((v) => ({ value: v.id, label: v.name })) ?? [], [options]);

    const applySaved = (studentId: string, vendorId: string, vendorName: string) => {
        setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, optedIn: true, vendorId, vendorName } : s)));
        // Refetch so the row still matches the active filters (e.g. an opted-in filter).
        setReloadKey((k) => k + 1);
    };
    const applyDeleted = (studentId: string) => {
        setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, optedIn: false, vendorId: null, vendorName: null } : s)));
        setReloadKey((k) => k + 1);
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Filters */}
            <div className="theme-section flex flex-wrap items-center gap-2">
                <Input type="month" value={month} onChange={(e) => withReset(setMonth)(e.target.value)} className="h-9 w-[160px] cursor-pointer" />
                <div className="relative min-w-[200px] flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or roll…" className="h-9 pl-8" />
                </div>
                <Select value={optedIn} onValueChange={(v) => withReset(setOptedIn)(v as "all" | "yes" | "no")}>
                    <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All students</SelectItem>
                        <SelectItem value="yes">Opted in</SelectItem>
                        <SelectItem value="no">Not opted in</SelectItem>
                    </SelectContent>
                </Select>
                <MultiSelect label="Vendors" options={vendorOptions} selected={selVendors} onChange={withReset(setSelVendors)} />
                {options && options.batches.length > 0 && (
                    <MultiSelect label="Batch" options={options.batches.map((b) => ({ value: b, label: b }))} selected={selBatches} onChange={withReset(setSelBatches)} />
                )}
                {options && options.hostels.length > 0 && (
                    <MultiSelect label="Hostel" options={options.hostels.map((h) => ({ value: h, label: h }))} selected={selHostels} onChange={withReset(setSelHostels)} />
                )}
                <MultiSelect label="Preference" options={(options?.preferences ?? []).map((p) => ({ value: p, label: p }))} selected={selPrefs} onChange={withReset(setSelPrefs)} />
                <Button variant="ghost" size="sm" onClick={resetFilters} className="ml-auto gap-1.5 text-muted-foreground">
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
            </div>

            {/* Result meta */}
            <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
                <span>
                    {loading ? "Loading…" : total === 0 ? "No students match these filters." : <>Showing <span className="font-medium text-foreground">{fmt(from)}–{fmt(to)}</span> of <span className="font-medium text-foreground">{fmt(total)}</span></>}
                </span>
                <span className="hidden sm:inline">Opt-ins shown for <span className="font-medium text-foreground">{label}</span></span>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead className="hidden md:table-cell">Roll</TableHead>
                            <TableHead className="hidden lg:table-cell">Batch</TableHead>
                            <TableHead className="hidden lg:table-cell">Hostel</TableHead>
                            <TableHead>{label}</TableHead>
                            <TableHead className="w-10 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={6}>
                                    <div className="flex flex-col items-center gap-3 py-10 text-center">
                                        <p className="text-sm text-destructive">{error}</p>
                                        <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>Retry</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : students.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6}><p className="py-10 text-center text-sm text-muted-foreground">No students found.</p></TableCell>
                            </TableRow>
                        ) : (
                            students.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell>
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-foreground">{s.name || "—"}</p>
                                            <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden text-muted-foreground md:table-cell">{s.roll || "—"}</TableCell>
                                    <TableCell className="hidden text-muted-foreground lg:table-cell">{s.batch || "—"}</TableCell>
                                    <TableCell className="hidden max-w-[180px] truncate text-muted-foreground lg:table-cell">{s.hostel || "—"}</TableCell>
                                    <TableCell>
                                        {s.optedIn ? (
                                            <div className="flex flex-col items-start gap-0.5">
                                                <Badge className="flex items-center gap-1 bg-primary/10 text-primary">
                                                    <Store className="h-3 w-3" />{s.vendorName ?? "Opted in"}
                                                </Badge>
                                                {s.preference && <span className="text-xs text-muted-foreground">{s.preference}</span>}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Not opted in</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => setChangeTarget(s)}>
                                                    <Pencil className="h-4 w-4" /> {s.optedIn ? "Change vendor" : "Add opt-in"}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setMealsTarget({ id: s.id, name: s.name, email: s.email })}>
                                                    <UtensilsCrossed className="h-4 w-4" /> View meals
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem variant="destructive" disabled={!s.optedIn} onClick={() => setDeleteTarget(s)}>
                                                    <Trash2 className="h-4 w-4" /> Remove opt-in
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Rows</span>
                    <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                        <SelectTrigger className="h-8 w-[76px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {PAGE_SIZES.map((s) => (<SelectItem key={s} value={String(s)}>{s}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Dialogs */}
            <ChangeVendorDialog
                open={!!changeTarget}
                onOpenChange={(v) => !v && setChangeTarget(null)}
                student={changeTarget}
                month={month}
                monthLabel={label}
                vendors={options?.vendors ?? []}
                onSaved={applySaved}
            />
            <DeleteSelectionDialog
                open={!!deleteTarget}
                onOpenChange={(v) => !v && setDeleteTarget(null)}
                student={deleteTarget}
                month={month}
                monthLabel={label}
                onDeleted={applyDeleted}
            />
            <MealDetailsDialog open={!!mealsTarget} onOpenChange={(v) => !v && setMealsTarget(null)} student={mealsTarget} />
        </div>
    );
}

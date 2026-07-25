"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { toast } from "sonner";
import { AlertTriangle, CalendarCheck, Loader2, Store, UtensilsCrossed } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MEAL_COLORS, type StudentRow, type VendorOption } from "./types";

const errMessage = (err: unknown, fallback: string): string => {
    if (typeof err === "object" && err !== null && "response" in err) {
        const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
        if (msg) return msg;
    }
    return fallback;
};

/* ------------------------------------------------------------------ */
/* Change / create a student's vendor selection for the working month  */
/* ------------------------------------------------------------------ */

export function ChangeVendorDialog({
    open,
    onOpenChange,
    student,
    month,
    monthLabel,
    vendors,
    onSaved,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    student: StudentRow | null;
    month: string;
    monthLabel: string;
    vendors: VendorOption[];
    onSaved: (studentId: string, vendorId: string, vendorName: string) => void;
}) {
    const [vendorId, setVendorId] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) setVendorId(student?.vendorId ?? "");
    }, [open, student]);

    const save = async () => {
        if (!student || !vendorId) return;
        setSaving(true);
        try {
            const res = await axiosInstance.patch("/api/admin/students/selection", { userId: student.id, month, vendorId });
            onSaved(student.id, res.data.vendorId, res.data.vendorName);
            toast.success(`${student.name || student.email} → ${res.data.vendorName} for ${monthLabel}.`);
            onOpenChange(false);
        } catch (err) {
            toast.error(errMessage(err, "Failed to update the selection."));
        } finally {
            setSaving(false);
        }
    };

    const unchanged = !!student?.optedIn && vendorId === student?.vendorId;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{student?.optedIn ? "Change vendor" : "Add opt-in"}</DialogTitle>
                    <DialogDescription>
                        {student?.name || student?.email} · {monthLabel}
                        {student?.optedIn && student.vendorName ? (
                            <> · currently <span className="font-medium text-foreground">{student.vendorName}</span></>
                        ) : null}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-1">
                    <Select value={vendorId} onValueChange={setVendorId} disabled={saving}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a vendor" />
                        </SelectTrigger>
                        <SelectContent>
                            {vendors.map((v) => (
                                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        {student?.optedIn ? "Moves this month's opt-in to the chosen vendor." : "Creates an opt-in for this month."}
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
                    <Button onClick={save} disabled={saving || !vendorId || unchanged}>
                        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ------------------------------------------------------------------ */
/* Hard-delete confirmation                                            */
/* ------------------------------------------------------------------ */

export function DeleteSelectionDialog({
    open,
    onOpenChange,
    student,
    month,
    monthLabel,
    onDeleted,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    student: StudentRow | null;
    month: string;
    monthLabel: string;
    onDeleted: (studentId: string) => void;
}) {
    const [deleting, setDeleting] = useState(false);

    const remove = async () => {
        if (!student) return;
        setDeleting(true);
        try {
            await axiosInstance.delete(`/api/admin/students/selection?userId=${student.id}&month=${month}`);
            onDeleted(student.id);
            toast.success(`Removed ${student.name || student.email}'s opt-in for ${monthLabel}.`);
            onOpenChange(false);
        } catch (err) {
            toast.error(errMessage(err, "Failed to remove the selection."));
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" /> Remove opt-in
                    </DialogTitle>
                    <DialogDescription>
                        Permanently remove <span className="font-medium text-foreground">{student?.name || student?.email}</span>&apos;s
                        selection ({student?.vendorName ?? "—"}) for <span className="font-medium text-foreground">{monthLabel}</span>?
                        This can&apos;t be undone — the student will show as not opted in.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>Cancel</Button>
                    <Button variant="destructive" onClick={remove} disabled={deleting}>
                        {deleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Removing…</> : "Remove"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ------------------------------------------------------------------ */
/* Meal details — monthly summary                                      */
/* ------------------------------------------------------------------ */

interface MealMonth {
    key: string;
    label: string;
    optedIn: boolean;
    vendorName: string | null;
    breakfast: number;
    lunch: number;
    dinner: number;
    total: number;
}

export function MealDetailsDialog({
    open,
    onOpenChange,
    student,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    student: { id: string; name: string; email: string } | null;
}) {
    const [loading, setLoading] = useState(false);
    const [months, setMonths] = useState<MealMonth[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !student) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        setMonths([]);
        axiosInstance
            .get(`/api/admin/students/meals?userId=${student.id}`)
            .then((res) => {
                if (!cancelled) setMonths(res.data.months ?? []);
            })
            .catch((err) => {
                if (!cancelled) setError(errMessage(err, "Failed to load meal details."));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [open, student]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UtensilsCrossed className="h-5 w-5 text-primary" /> Meal history
                    </DialogTitle>
                    <DialogDescription>{student?.name} · {student?.email}</DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                    {loading ? (
                        <>
                            <Skeleton className="h-20 w-full rounded-xl" />
                            <Skeleton className="h-20 w-full rounded-xl" />
                        </>
                    ) : error ? (
                        <p className="py-8 text-center text-sm text-destructive">{error}</p>
                    ) : months.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">No opt-ins or meals recorded yet.</p>
                    ) : (
                        months.map((m) => (
                            <div key={m.key} className="rounded-xl border border-border bg-card p-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-foreground">{m.label}</span>
                                    {m.optedIn ? (
                                        <Badge className="flex items-center gap-1 bg-primary/10 text-primary">
                                            <Store className="h-3 w-3" /> {m.vendorName ?? "Opted in"}
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-muted text-muted-foreground">
                                            <CalendarCheck className="mr-1 h-3 w-3" /> Not opted in
                                        </Badge>
                                    )}
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    {MEAL_COLORS.map((mt) => (
                                        <div key={mt.key} className="rounded-lg bg-muted/50 py-1.5">
                                            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                                                <span className="h-2 w-2 rounded-sm" style={{ background: mt.color }} />
                                                {mt.label}
                                            </div>
                                            <p className="text-base font-bold tabular-nums text-foreground">{m[mt.key]}</p>
                                        </div>
                                    ))}
                                    <div className="rounded-lg bg-primary/10 py-1.5">
                                        <div className="text-[11px] text-primary/80">Total</div>
                                        <p className="text-base font-bold tabular-nums text-primary">{m.total}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

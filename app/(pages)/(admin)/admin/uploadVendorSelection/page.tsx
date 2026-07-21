"use client";

import React, { useEffect, useMemo, useState } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ClipboardPaste, Upload, UserPlus, Users, AlertTriangle, XCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import RequireRole from "../RequireRole";

interface VendorOption {
  id: string;
  name: string;
}

interface CreateEntry {
  email: string;
  userId: string;
  name: string;
}

interface DuplicateEntry {
  email: string;
  userId: string;
  name: string;
  currentVendorId: string;
  currentVendorName: string | null;
  alreadyThisVendor: boolean;
}

interface VerifyResult {
  vendor: VendorOption;
  month: string;
  toCreate: CreateEntry[];
  duplicates: DuplicateEntry[];
  notFound: string[];
  invalid: string[];
}

const errMessage = (err: unknown, fallback: string): string => {
  if (typeof err === "object" && err !== null && "response" in err) {
    const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return msg;
  }
  return fallback;
};

const UploadVendorSelectionPage = () => {
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [month, setMonth] = useState("");
  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [emailsText, setEmailsText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [overwriteIds, setOverwriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadVendors = async () => {
      try {
        const res = await axiosInstance.get(`/api/vendor/getVendors`);
        if (Array.isArray(res.data.vendors)) {
          setVendors(res.data.vendors.map((v: VendorOption) => ({ id: v.id, name: v.name })));
        }
      } catch {
        toast.error("Failed to load vendors.");
      }
    };
    loadVendors();
  }, []);

  // Live count of pasted email-like tokens (contain '@'), for quick feedback before verifying.
  const pastedCount = useMemo(
    () => emailsText.split(/[\s,;]+/).map((t) => t.trim()).filter((t) => t.includes("@")).length,
    [emailsText],
  );

  const overwritable = useMemo(
    () => (result ? result.duplicates.filter((d) => !d.alreadyThisVendor) : []),
    [result],
  );

  const resetAll = () => {
    setResult(null);
    setOverwriteIds(new Set());
    setEmailsText("");
    setFile(null);
  };

  const handleVerify = async () => {
    if (!vendorId) return toast.error("Select a vendor.");
    if (!month) return toast.error("Select a month.");
    if (mode === "paste" && pastedCount === 0) return toast.error("Paste at least one email.");
    if (mode === "file" && !file) return toast.error("Choose a file to upload.");

    setIsVerifying(true);
    try {
      const fd = new FormData();
      fd.append("vendorId", vendorId);
      fd.append("month", month);
      if (mode === "paste") fd.append("emails", emailsText);
      if (mode === "file" && file) fd.append("file", file);

      const res = await axiosInstance.post(`/api/admin/upload-vendor-selection/verify`, fd);
      setResult(res.data as VerifyResult);
      setOverwriteIds(new Set());
    } catch (err) {
      toast.error(errMessage(err, "Failed to verify emails."));
    } finally {
      setIsVerifying(false);
    }
  };

  const toggleOverwrite = (userId: string) => {
    setOverwriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setOverwriteIds((prev) =>
      prev.size === overwritable.length ? new Set() : new Set(overwritable.map((d) => d.userId)),
    );
  };

  const handleCommit = async () => {
    if (!result) return;
    const createUserIds = result.toCreate.map((c) => c.userId);
    const overwriteUserIds = Array.from(overwriteIds);
    if (createUserIds.length === 0 && overwriteUserIds.length === 0) {
      return toast.error("Nothing to save — no new students and no duplicates selected to change.");
    }

    setIsCommitting(true);
    try {
      const res = await axiosInstance.post(`/api/admin/upload-vendor-selection/commit`, {
        vendorId: result.vendor.id,
        month: result.month,
        createUserIds,
        overwriteUserIds,
      });
      const { created, overwritten } = res.data;
      toast.success("Vendor selections saved!", {
        description: `${created} added${overwritten ? `, ${overwritten} moved` : ""} for ${result.vendor.name}.`,
      });
      resetAll();
    } catch (err) {
      toast.error(errMessage(err, "Failed to save vendor selections."));
    } finally {
      setIsCommitting(false);
    }
  };

  // ---------- STEP 2: review ----------
  if (result) {
    const willCreate = result.toCreate.length;
    const willOverwrite = overwriteIds.size;
    const nothingToSave = willCreate === 0 && willOverwrite === 0;

    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-border bg-card shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-primary sm:text-2xl">Review &amp; Confirm</CardTitle>
            <CardDescription>
              <span className="font-medium text-foreground">{result.vendor.name}</span> · {result.month}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryTile icon={UserPlus} label="To add" value={willCreate} tone="emerald" />
              <SummaryTile icon={Users} label="Already opted" value={result.duplicates.length} tone="amber" />
              <SummaryTile icon={AlertTriangle} label="Not found" value={result.notFound.length} tone="rose" />
              <SummaryTile icon={XCircle} label="Invalid" value={result.invalid.length} tone="zinc" />
            </div>

            {/* Detail: duplicates get the wide column; skipped lists sit alongside on desktop */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {result.duplicates.length > 0 && (
                <section className="space-y-2 lg:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">Already opted in this month</h3>
                    {overwritable.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        disabled={isCommitting}
                        className="shrink-0 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                      >
                        {overwriteIds.size === overwritable.length ? "Keep all" : `Change all to ${result.vendor.name}`}
                      </button>
                    )}
                  </div>
                  <ul className="max-h-[24rem] divide-y divide-border overflow-y-auto rounded-xl border border-border">
                    {result.duplicates.map((d) => (
                      <li key={d.userId} className="flex items-center justify-between gap-3 p-3 sm:px-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{d.name || d.email}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {d.email} · currently {d.currentVendorName ?? "another vendor"}
                          </p>
                        </div>
                        {d.alreadyThisVendor ? (
                          <Badge className="shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">Already this vendor</Badge>
                        ) : (
                          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                            <Checkbox checked={overwriteIds.has(d.userId)} onCheckedChange={() => toggleOverwrite(d.userId)} disabled={isCommitting} />
                            Change
                          </label>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">Unchecked students keep their current vendor.</p>
                </section>
              )}

              {(result.notFound.length > 0 || result.invalid.length > 0) && (
                <section
                  className={cn(
                    "space-y-3",
                    result.duplicates.length > 0 ? "lg:col-span-1" : "lg:col-span-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0",
                  )}
                >
                  {result.notFound.length > 0 && (
                    <CollapsibleList title={`Not found — ${result.notFound.length}`} subtitle="will be skipped" items={result.notFound} tone="rose" />
                  )}
                  {result.invalid.length > 0 && (
                    <CollapsibleList title={`Invalid format — ${result.invalid.length}`} subtitle="will be skipped" items={result.invalid} tone="zinc" />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Skipped emails won&apos;t be saved. Fix them and start again, or continue to save the rest.
                  </p>
                </section>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={resetAll} disabled={isCommitting} className="w-full sm:w-auto">
                <RotateCcw className="h-4 w-4" />
                Start again
              </Button>
              <Button
                onClick={handleCommit}
                disabled={isCommitting || nothingToSave}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white sm:w-auto sm:min-w-52"
              >
                {isCommitting
                  ? "Saving…"
                  : `Confirm & Save${willCreate + willOverwrite > 0 ? ` (${willCreate + willOverwrite})` : ""}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- STEP 1: input ----------
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col px-4 py-8 sm:px-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <Card className="border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-primary sm:text-2xl">Upload Vendor Selection</CardTitle>
          <CardDescription>Pick a vendor and month, then add the students&apos; emails.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
            {/* Left: what + when */}
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Select value={vendorId} onValueChange={setVendorId} disabled={isVerifying}>
                  <SelectTrigger id="vendor" className="w-full">
                    <SelectValue placeholder="Select a vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="month">Month</Label>
                <Input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} disabled={isVerifying} className="cursor-pointer" />
              </div>
            </div>

            {/* Right: who (emails) */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setMode("paste")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    mode === "paste" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ClipboardPaste className="h-4 w-4" /> Paste
                </button>
                <button
                  type="button"
                  onClick={() => setMode("file")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    mode === "file" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Upload className="h-4 w-4" /> File
                </button>
              </div>

              {mode === "paste" ? (
                <div className="space-y-2">
                  <Label htmlFor="emails">Student emails</Label>
                  <Textarea
                    id="emails"
                    value={emailsText}
                    onChange={(e) => setEmailsText(e.target.value)}
                    placeholder="Paste emails separated by spaces, commas, or new lines…"
                    className="min-h-40 lg:min-h-48"
                    disabled={isVerifying}
                  />
                  <p className="text-xs text-muted-foreground">{pastedCount} email{pastedCount === 1 ? "" : "s"} detected</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="file">CSV / Excel of emails</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    disabled={isVerifying}
                    className="cursor-pointer file:cursor-pointer file:text-foreground file:bg-secondary hover:file:bg-secondary/80"
                  />
                  <p className="text-xs text-muted-foreground">Any column with emails works — other columns are ignored.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex border-t border-border pt-5 sm:justify-end">
            <Button
              onClick={handleVerify}
              disabled={isVerifying}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white sm:w-auto sm:min-w-48"
            >
              {isVerifying ? <Skeleton className="h-5 w-20" /> : "Verify"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const toneClass: Record<string, string> = {
  emerald: "text-emerald-600 dark:text-emerald-300",
  amber: "text-amber-600 dark:text-amber-300",
  rose: "text-rose-600 dark:text-rose-300",
  zinc: "text-zinc-600 dark:text-zinc-300",
};

const SummaryTile = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: string;
}) => (
  <div className="rounded-xl border border-border bg-background/40 px-3 py-2.5">
    <div className={cn("flex items-center gap-1.5", toneClass[tone])}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate text-xs font-medium">{label}</span>
    </div>
    <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{value}</p>
  </div>
);

const CollapsibleList = ({ title, subtitle, items, tone }: { title: string; subtitle?: string; items: string[]; tone: string }) => (
  <details className="rounded-xl border border-border">
    <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold">
      <span className={toneClass[tone]}>{title}</span>
      {subtitle && <span className="ml-1 font-normal text-muted-foreground">({subtitle})</span>}
    </summary>
    <ul className="max-h-40 space-y-1 overflow-y-auto px-3 pb-3 pt-1">
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className="truncate text-xs text-muted-foreground">{item}</li>
      ))}
    </ul>
  </details>
);

const GuardedUploadVendorSelectionPage = () => (
  <RequireRole roles={["superAdmin"]}>
    <UploadVendorSelectionPage />
  </RequireRole>
);

export default GuardedUploadVendorSelectionPage;

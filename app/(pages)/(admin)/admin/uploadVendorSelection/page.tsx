"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ClipboardPaste, Upload, UserPlus, Users, AlertTriangle, XCircle, RotateCcw,
  Loader2, CheckCircle2, Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import RequireRole from "../RequireRole";

interface VendorOption { id: string; name: string }
interface CreateEntry { email: string; userId: string; name: string }
interface DuplicateEntry {
  email: string; userId: string; name: string;
  currentVendorId: string; currentVendorName: string | null; alreadyThisVendor: boolean;
}
interface VerifyResult {
  vendor: VendorOption; month: string;
  toCreate: CreateEntry[]; duplicates: DuplicateEntry[]; notFound: string[]; invalid: string[];
}
type TabKey = "toCreate" | "duplicates" | "notFound" | "invalid";
interface ResultRow { name: string; email: string; vendorName: string; action: "added" | "moved" | "kept" }
interface CommitSummary { vendorName: string; month: string; rows: ResultRow[]; skipped: number }

const errMessage = (err: unknown, fallback: string): string => {
  if (typeof err === "object" && err !== null && "response" in err) {
    const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return msg;
  }
  return fallback;
};

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; tone: string }[] = [
  { key: "toCreate", label: "To add", icon: UserPlus, tone: "emerald" },
  { key: "duplicates", label: "Already opted", icon: Users, tone: "amber" },
  { key: "notFound", label: "Not found", icon: AlertTriangle, tone: "rose" },
  { key: "invalid", label: "Invalid", icon: XCircle, tone: "zinc" },
];

const UploadVendorSelectionPage = () => {
  const router = useRouter();
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
  const [activeTab, setActiveTab] = useState<TabKey>("toCreate");
  const [committed, setCommitted] = useState<CommitSummary | null>(null);

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
    setCommitted(null);
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
      const data = res.data as VerifyResult;
      setResult(data);
      setOverwriteIds(new Set());
      setActiveTab(
        data.toCreate.length ? "toCreate"
          : data.duplicates.length ? "duplicates"
            : data.notFound.length ? "notFound" : "invalid",
      );
    } catch (err) {
      toast.error(errMessage(err, "Failed to verify emails."));
    } finally {
      setIsVerifying(false);
    }
  };

  const toggleOverwrite = (userId: string) =>
    setOverwriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });

  const toggleSelectAll = () =>
    setOverwriteIds((prev) =>
      prev.size === overwritable.length ? new Set() : new Set(overwritable.map((d) => d.userId)),
    );

  const handleCommit = async () => {
    if (!result) return;
    const createUserIds = result.toCreate.map((c) => c.userId);
    const overwriteUserIds = Array.from(overwriteIds);
    if (createUserIds.length === 0 && overwriteUserIds.length === 0) {
      return toast.error("Nothing to save — no new students, and no duplicates set to change.");
    }

    setIsCommitting(true);
    try {
      await axiosInstance.post(`/api/admin/upload-vendor-selection/commit`, {
        vendorId: result.vendor.id, month: result.month, createUserIds, overwriteUserIds,
      });
      // Build the results view from data we already have — no extra API call.
      const rows: ResultRow[] = [
        ...result.toCreate.map((c): ResultRow => ({ name: c.name, email: c.email, vendorName: result.vendor.name, action: "added" })),
        ...result.duplicates.map((d): ResultRow =>
          overwriteIds.has(d.userId)
            ? { name: d.name, email: d.email, vendorName: result.vendor.name, action: "moved" }
            : { name: d.name, email: d.email, vendorName: d.currentVendorName ?? result.vendor.name, action: "kept" }),
      ];
      setCommitted({
        vendorName: result.vendor.name,
        month: result.month,
        rows,
        skipped: result.notFound.length + result.invalid.length,
      });
    } catch (err) {
      toast.error(errMessage(err, "Failed to save vendor selections."));
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <>
      {(isVerifying || isCommitting) && (
        <ProgressLoader
          phase={isCommitting ? "commit" : "verify"}
          total={
            isCommitting
              ? (result ? result.toCreate.length + overwriteIds.size : undefined)
              : (mode === "paste" ? pastedCount : undefined)
          }
        />
      )}

      {committed ? (
        <ResultsView summary={committed} onHome={() => router.replace("/admin/dashboard")} />
      ) : result ? (
        <ReviewView
          result={result}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          overwriteIds={overwriteIds}
          overwritable={overwritable}
          toggleOverwrite={toggleOverwrite}
          toggleSelectAll={toggleSelectAll}
          isCommitting={isCommitting}
          onReset={resetAll}
          onCommit={handleCommit}
        />
      ) : (
        <div className="mx-auto flex w-full max-w-4xl flex-col px-4 py-8 sm:px-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
          <Card className="border-border bg-card shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-primary sm:text-2xl">Upload Vendor Selection</CardTitle>
              <CardDescription>Pick a vendor and month, then add the students&apos; emails.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="vendor">Vendor</Label>
                    <Select value={vendorId} onValueChange={setVendorId} disabled={isVerifying}>
                      <SelectTrigger id="vendor" className="w-full"><SelectValue placeholder="Select a vendor" /></SelectTrigger>
                      <SelectContent>
                        {vendors.map((v) => (<SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="month">Month</Label>
                    <Input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} disabled={isVerifying} className="cursor-pointer" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                    <button type="button" onClick={() => setMode("paste")} className={cn("flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors", mode === "paste" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                      <ClipboardPaste className="h-4 w-4" /> Paste
                    </button>
                    <button type="button" onClick={() => setMode("file")} className={cn("flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors", mode === "file" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                      <Upload className="h-4 w-4" /> File
                    </button>
                  </div>

                  {mode === "paste" ? (
                    <div className="space-y-2">
                      <Label htmlFor="emails">Student emails</Label>
                      <Textarea id="emails" value={emailsText} onChange={(e) => setEmailsText(e.target.value)} placeholder="Paste emails separated by spaces, commas, or new lines…" className="min-h-40 max-h-80 overflow-y-auto" disabled={isVerifying} />
                      <p className="text-xs text-muted-foreground">{pastedCount} email{pastedCount === 1 ? "" : "s"} detected</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="file">CSV / Excel of emails</Label>
                      <Input id="file" type="file" accept=".csv, .xlsx, .xls" onChange={(e) => setFile(e.target.files?.[0] ?? null)} disabled={isVerifying} className="cursor-pointer file:cursor-pointer file:text-foreground file:bg-secondary hover:file:bg-secondary/80" />
                      <p className="text-xs text-muted-foreground">Any column with emails works — other columns are ignored.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex border-t border-border pt-5 sm:justify-end">
                <Button onClick={handleVerify} disabled={isVerifying} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white sm:w-auto sm:min-w-48">
                  {isVerifying ? "Verifying…" : "Verify"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

// ------------------------------------------------------------------ components

const toneClass: Record<string, string> = {
  emerald: "text-emerald-600 dark:text-emerald-300",
  amber: "text-amber-600 dark:text-amber-300",
  rose: "text-rose-600 dark:text-rose-300",
  zinc: "text-zinc-600 dark:text-zinc-300",
};

// Full-screen staged progress. The verify/commit are each a single (atomic) request, so real per-row
// progress isn't available without breaking the transaction — this advances through honest stage
// labels with an animated bar and the total count, which reads as progress while the request is in flight.
const STAGES: Record<"verify" | "commit", string[]> = {
  verify: ["Reading emails…", "Matching students…", "Checking existing selections…"],
  commit: ["Validating…", "Writing selections…", "Finishing up…"],
};

const ProgressLoader = ({ phase, total }: { phase: "verify" | "commit"; total?: number }) => {
  const stages = STAGES[phase];
  const title = phase === "verify" ? "Checking emails" : "Saving selections";
  const [stage, setStage] = useState(0);
  const [pct, setPct] = useState(10);

  useEffect(() => {
    const s = setInterval(() => setStage((p) => Math.min(p + 1, stages.length - 1)), 900);
    // Ease toward 92% while the request is in flight; the next view appearing is the "done" signal.
    const p = setInterval(() => setPct((prev) => (prev >= 92 ? prev : prev + Math.max(1, Math.round((92 - prev) / 10)))), 140);
    return () => { clearInterval(s); clearInterval(p); };
  }, [stages.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center gap-2.5">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {total ? <span className="ml-auto text-xs tabular-nums text-muted-foreground">{total.toLocaleString()} student{total === 1 ? "" : "s"}</span> : null}
        </div>
        <p className="mt-1 h-4 text-xs text-muted-foreground">{stages[stage]}</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
};

const CategoryTile = ({ active, icon: Icon, label, value, tone, onClick }: {
  active: boolean; icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: string; onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "rounded-xl border px-3 py-2.5 text-left transition-colors",
      active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-background/40 hover:bg-[color:var(--surface-hover)]",
    )}
  >
    <div className={cn("flex items-center gap-1.5", toneClass[tone])}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate text-xs font-medium">{label}</span>
    </div>
    <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{value}</p>
  </button>
);

const EmptyPanel = ({ children }: { children: React.ReactNode }) => (
  <p className="p-8 text-center text-sm text-muted-foreground">{children}</p>
);

const ReviewView = ({
  result, activeTab, setActiveTab, overwriteIds, overwritable, toggleOverwrite, toggleSelectAll, isCommitting, onReset, onCommit,
}: {
  result: VerifyResult; activeTab: TabKey; setActiveTab: (t: TabKey) => void;
  overwriteIds: Set<string>; overwritable: DuplicateEntry[];
  toggleOverwrite: (id: string) => void; toggleSelectAll: () => void;
  isCommitting: boolean; onReset: () => void; onCommit: () => void;
}) => {
  const counts: Record<TabKey, number> = {
    toCreate: result.toCreate.length,
    duplicates: result.duplicates.length,
    notFound: result.notFound.length,
    invalid: result.invalid.length,
  };
  const willSave = result.toCreate.length + overwriteIds.size;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-primary sm:text-2xl">Review &amp; Confirm</CardTitle>
          <CardDescription><span className="font-medium text-foreground">{result.vendor.name}</span> · {result.month}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Clickable category tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TABS.map((t) => (
              <CategoryTile key={t.key} active={activeTab === t.key} icon={t.icon} label={t.label} value={counts[t.key]} tone={t.tone} onClick={() => setActiveTab(t.key)} />
            ))}
          </div>

          {/* Fixed-height panel showing the selected category (scrolls internally, never grows the page) */}
          <div className="overflow-hidden rounded-xl border border-border">
            {activeTab === "duplicates" && result.duplicates.length > 0 && (
              <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-3 py-2">
                <span className="text-xs text-muted-foreground">Unchecked students keep their current vendor.</span>
                {overwritable.length > 0 && (
                  <button type="button" onClick={toggleSelectAll} disabled={isCommitting} className="shrink-0 text-xs font-medium text-primary hover:underline disabled:opacity-50">
                    {overwriteIds.size === overwritable.length ? "Keep all" : `Change all to ${result.vendor.name}`}
                  </button>
                )}
              </div>
            )}

            <div className="h-80 overflow-y-auto">
              {activeTab === "toCreate" && (
                result.toCreate.length === 0 ? <EmptyPanel>No new students to add.</EmptyPanel> : (
                  <ul className="divide-y divide-border">
                    {result.toCreate.map((c) => (
                      <li key={c.userId} className="flex items-center justify-between gap-3 p-3 sm:px-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{c.name || c.email}</p>
                          <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                        </div>
                        <Badge className="shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">will be added</Badge>
                      </li>
                    ))}
                  </ul>
                )
              )}

              {activeTab === "duplicates" && (
                result.duplicates.length === 0 ? <EmptyPanel>No students are already opted in this month.</EmptyPanel> : (
                  <ul className="divide-y divide-border">
                    {result.duplicates.map((d) => (
                      <li key={d.userId} className="flex items-center justify-between gap-3 p-3 sm:px-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{d.name || d.email}</p>
                          <p className="truncate text-xs text-muted-foreground">{d.email} · currently {d.currentVendorName ?? "another vendor"}</p>
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
                )
              )}

              {activeTab === "notFound" && (
                result.notFound.length === 0 ? <EmptyPanel>Every email matched a student.</EmptyPanel> : (
                  <ul className="divide-y divide-border">
                    {result.notFound.map((e, i) => (
                      <li key={`${e}-${i}`} className="truncate px-3 py-2.5 text-sm text-muted-foreground sm:px-4">{e}</li>
                    ))}
                  </ul>
                )
              )}

              {activeTab === "invalid" && (
                result.invalid.length === 0 ? <EmptyPanel>No malformed emails.</EmptyPanel> : (
                  <ul className="divide-y divide-border">
                    {result.invalid.map((e, i) => (
                      <li key={`${e}-${i}`} className="truncate px-3 py-2.5 text-sm text-muted-foreground sm:px-4">{e}</li>
                    ))}
                  </ul>
                )
              )}
            </div>
          </div>

          {(result.notFound.length > 0 || result.invalid.length > 0) && (
            <p className="text-xs text-muted-foreground">Not-found and invalid emails are skipped — they won&apos;t be saved.</p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onReset} disabled={isCommitting} className="w-full sm:w-auto">
              <RotateCcw className="h-4 w-4" /> Start again
            </Button>
            <Button onClick={onCommit} disabled={isCommitting || willSave === 0} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white sm:w-auto sm:min-w-52">
              {willSave > 0 ? `Confirm & Save (${willSave})` : "Confirm & Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const actionBadge: Record<ResultRow["action"], string> = {
  added: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  moved: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  kept: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
};

const ResultsView = ({ summary, onHome }: { summary: CommitSummary; onHome: () => void }) => {
  const added = summary.rows.filter((r) => r.action === "added").length;
  const moved = summary.rows.filter((r) => r.action === "moved").length;
  const kept = summary.rows.filter((r) => r.action === "kept").length;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-border bg-card shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            <CardTitle className="text-xl font-bold text-primary sm:text-2xl">Upload complete</CardTitle>
          </div>
          <CardDescription><span className="font-medium text-foreground">{summary.vendorName}</span> · {summary.month}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2 text-sm">
            {added > 0 && <Badge className={actionBadge.added}>{added} added</Badge>}
            {moved > 0 && <Badge className={actionBadge.moved}>{moved} moved</Badge>}
            {kept > 0 && <Badge className={actionBadge.kept}>{kept} kept</Badge>}
            {summary.skipped > 0 && <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-300">{summary.skipped} skipped</Badge>}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Students &amp; their vendor ({summary.rows.length})</h3>
            <div className="h-96 overflow-y-auto rounded-xl border border-border">
              <ul className="divide-y divide-border">
                {summary.rows.map((r, i) => (
                  <li key={`${r.email}-${i}`} className="flex items-center justify-between gap-3 p-3 sm:px-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{r.name || r.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.email} · {r.vendorName}</p>
                    </div>
                    <Badge className={cn("shrink-0", actionBadge[r.action])}>{r.action}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex border-t border-border pt-4 sm:justify-end">
            <Button onClick={onHome} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white sm:w-auto sm:min-w-48">
              <Home className="h-4 w-4" /> Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const GuardedUploadVendorSelectionPage = () => (
  <RequireRole roles={["superAdmin"]}>
    <UploadVendorSelectionPage />
  </RequireRole>
);

export default GuardedUploadVendorSelectionPage;

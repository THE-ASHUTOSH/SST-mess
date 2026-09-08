"use client";

import React, { useCallback, useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { toast } from "sonner";
import { CalendarDays, Download, IndianRupee, Store, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import MenuDayScroller from "@/components/features/menu/MenuDayScroller";
import { useUser } from "@/context/UserContext";

interface Vendor {
  id: string;
  name: string;
  price: number;
  description: string | null;
  menuUrl: string | null;
}

/**
 * Read-only twin of the admin menu editor: same day cards, no pencil.
 *
 * Replaces the old /student/vendorDetails page, so it also carries what that page showed — each
 * vendor's price, description and downloadable menu link — rather than leaving those homeless.
 *
 * Every vendor is browsable (not just the one the student opted into) so they can compare before
 * next month's selection. Their own vendor is highlighted and selected first.
 */

/**
 * A Google Drive "view" link streams a viewer page, not the file. Rewrite it to the direct download
 * form so the button actually downloads. Carried over from the page this one replaces.
 */
function toDownloadUrl(url: string): string {
  if (!url.includes("drive.google.com/file")) return url;
  const id = url.split("/d/")[1]?.split("/")[0];
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : url;
}
const StudentMenuPage = () => {
  const { user } = useUser();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [myVendorId, setMyVendorId] = useState<string>("");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // The student's own vendor is nice-to-have; a missing one just means nothing is preselected.
      const [vendorRes, mineRes] = await Promise.all([
        axiosInstance.get(`/api/vendor/getVendors`),
        axiosInstance.get(`/api/user/latest-vendor`).catch(() => null),
      ]);

      const list: Vendor[] = Array.isArray(vendorRes.data.vendors)
        ? vendorRes.data.vendors.map((v: Vendor) => ({
            id: v.id, name: v.name, price: v.price,
            description: v.description ?? null, menuUrl: v.menuUrl ?? null,
          }))
        : [];
      setVendors(list);

      const mine: string | undefined = mineRes?.data?.vendor?.id;
      setMyVendorId(mine ?? "");
      setSelectedVendorId(mine ?? list[0]?.id ?? "");
    } catch {
      toast.error("Failed to load vendors.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold text-primary">
            <Utensils className="h-6 w-6" /> What&apos;s cooking
          </CardTitle>
          <CardDescription>
            {user?.name ? `${user.name.split(" ")[0]}, here's` : "Here's"} the next two weeks of meals.
            Swipe or use the arrows to look ahead.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-32 rounded-full" />)}
            </div>
          ) : vendors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vendors available yet.</p>
          ) : (
            // Pills rather than a dropdown: with three vendors it is one tap instead of two, and the
            // student can see at a glance which one is theirs.
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Choose a vendor">
              {vendors.map((v) => {
                const active = v.id === selectedVendorId;
                return (
                  <button
                    key={v.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedVendorId(v.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-accent",
                    )}
                  >
                    <Store className="h-3.5 w-3.5" />
                    <span className="max-w-[16ch] truncate sm:max-w-none">{v.name}</span>
                    {v.id === myVendorId && (
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase",
                        active ? "bg-primary-foreground/20" : "bg-primary/10 text-primary",
                      )}>
                        Yours
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedVendorId ? (
        <Card className="border-border bg-card shadow-lg">
          {selectedVendor && (
            // Price / description / menu download — the details the old vendorDetails page carried.
            <CardHeader className="gap-2 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Store className="h-5 w-5 text-primary" />
                    <span className="truncate">{selectedVendor.name}</span>
                  </CardTitle>
                  {selectedVendor.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{selectedVendor.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                    <IndianRupee className="h-3.5 w-3.5" />
                    {selectedVendor.price}
                  </span>
                  {selectedVendor.menuUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={toDownloadUrl(selectedVendor.menuUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-4 w-4" />
                        Menu
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          )}
          <CardContent className={selectedVendor ? "pt-0" : "pt-6"}>
            <MenuDayScroller vendorId={selectedVendorId} />
          </CardContent>
        </Card>
      ) : !loading && (
        <Card className="border-dashed border-border bg-card/60">
          <CardContent className="py-14 text-center">
            <CalendarDays className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Pick a vendor to see their menu.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentMenuPage;

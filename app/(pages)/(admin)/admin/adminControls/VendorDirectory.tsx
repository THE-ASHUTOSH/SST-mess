"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface DirectoryVendor {
  id: string;
  name: string;
  email: string | null;
  price: number;
}

/**
 * Read-only vendor directory for the Controls page (superAdmin only). Shows the vendor↔email
 * mapping at a glance. Intentionally has NO add/edit/delete — those live in Manage Vendors.
 */
const VendorDirectory = () => {
  const [vendors, setVendors] = useState<DirectoryVendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get(`/api/admin/vendors`);
        if (Array.isArray(res.data.vendors)) setVendors(res.data.vendors);
      } catch {
        // Non-superAdmins never render this component; a failure just leaves an empty directory.
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Card className="w-full max-w-2xl border-border bg-card shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-primary">Vendor Directory</CardTitle>
        <CardDescription>
          Read-only view of vendors and the login email each is mapped to. Manage (add / edit / remove) under Manage Vendors.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : vendors.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No vendors yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {vendors.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{v.name}</p>
                  {v.email ? (
                    <p className="truncate text-xs text-muted-foreground">{v.email}</p>
                  ) : (
                    <Badge className="mt-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-300">No login email</Badge>
                  )}
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">₹{v.price}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default VendorDirectory;

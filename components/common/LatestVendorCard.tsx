"use client";

import React from "react";
import { Utensils } from "lucide-react";

const LatestVendorCard = ({ vendorName }: { vendorName: string }) => {
  return (
    <div className="app-shell-kpi w-full rounded-2xl px-4 py-3.5 flex items-center gap-3 overflow-hidden">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--surface-active)] text-primary shrink-0">
        <Utensils className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground truncate">
          Your vendor this month
        </p>
        <p
          className="text-base sm:text-lg font-semibold text-foreground truncate"
          title={vendorName}
        >
          {vendorName}
        </p>
      </div>
    </div>
  );
};

export default LatestVendorCard;

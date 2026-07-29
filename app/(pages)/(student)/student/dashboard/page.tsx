"use client";

import React from "react";
import { BookOpen, CalendarCheck, MessageSquare } from "lucide-react";
import EventCard from "@/components/common/EventCard";
import LatestVendorCard from "@/components/common/LatestVendorCard";
import MealQRPanel from "@/components/features/meal/MealQRPanel";
import PageHeader from "@/components/common/layout/PageHeader";
import { useDashboard } from "@/context/DashboardContext";
import { VendorCardSkeleton, CardSkeleton } from "@/components/common/Skeletons";
import { Card } from "@/components/ui/card";

const Dashboard = () => {
  const { latestSelection, loading, isFeedbackEnabled } = useDashboard();

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-4">
          <Card className="rounded-2xl h-[26rem] animate-pulse" />
          <div className="flex flex-col gap-4">
            <VendorCardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Dashboard"
        description="Generate your QR, view menus, and share feedback."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-4 items-start">
        <div className="min-w-0">
          <MealQRPanel />
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          {latestSelection ? (
            <LatestVendorCard vendorName={latestSelection.vendor.name} />
          ) : (
            <div className="app-shell-kpi rounded-2xl px-4 py-4">
              <p className="text-sm text-muted-foreground">
                You are opted out for this month.
              </p>
            </div>
          )}

          <EventCard
            title="Menu"
            description="Daily and weekly menus by vendor"
            redirectUrl="/student/vendorDetails"
            icon={BookOpen}
          />

          <EventCard
            title="Meal History"
            description="The months you've opted in for mess"
            redirectUrl="/student/mealHistory"
            icon={CalendarCheck}
          />

          <EventCard
            title="Feedback"
            description={
              isFeedbackEnabled && latestSelection !== null
                ? "Rate your vendor — open this month"
                : "Currently closed"
            }
            redirectUrl="/student/feedback"
            enabled={isFeedbackEnabled && latestSelection !== null}
            icon={MessageSquare}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

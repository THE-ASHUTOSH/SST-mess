"use client";

import React from "react";
import {
  BarChart3,
  ClipboardList,
  ScanLine,
  Sliders,
  Store,
  Upload,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";
import EventCard from "@/components/common/EventCard";
import PageHeader from "@/components/common/layout/PageHeader";

const Dashboard = () => {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Admin Dashboard"
        description="Manage vendors, menus, selections, and analytics."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <EventCard
          title="Verify Student QR"
          description="Scan a student's QR manually"
          redirectUrl="/admin/verifyStudentQR"
          icon={ScanLine}
        />
        <EventCard
          title="Update Vendor Menu"
          description="Edit menus, price and meal options"
          redirectUrl="/admin/updateVendorMenu"
          icon={Utensils}
        />
        <EventCard
          title="Add Vendor"
          description="Onboard a new vendor"
          redirectUrl="/admin/addVendor"
          icon={Store}
        />
        <EventCard
          title="Choice Analysis"
          description="Vendor popularity and student picks"
          redirectUrl="/admin/choiceAnalysis"
          icon={BarChart3}
        />
        <EventCard
          title="Feedback Analysis"
          description="Aggregate ratings and comments"
          redirectUrl="/admin/feedBackAnalysis"
          icon={ClipboardList}
        />
        <EventCard
          title="Controls"
          description="Toggle feedback window and system flags"
          redirectUrl="/admin/adminControls"
          icon={Sliders}
        />
        <EventCard
          title="Upload Vendor Selection"
          description="Bulk-upload the monthly xlsx"
          redirectUrl="/admin/uploadVendorSelection"
          icon={Upload}
        />
        <EventCard
          title="Total Meals"
          description="Calculate served meals for billing"
          redirectUrl="/admin/totalMeals"
          icon={UtensilsCrossed}
        />
      </div>
    </div>
  );
};

export default Dashboard;

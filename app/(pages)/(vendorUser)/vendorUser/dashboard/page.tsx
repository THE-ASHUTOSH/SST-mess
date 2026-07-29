"use client";

import React from "react";
import { ScanLine, UtensilsCrossed } from "lucide-react";
import EventCard from "@/components/common/EventCard";
import PageHeader from "@/components/common/layout/PageHeader";

const Dashboard = () => {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Vendor Dashboard"
        description="Verify student QR codes and review served meals."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <EventCard
          title="Verify Student QR"
          description="Scan a student's QR code"
          redirectUrl="/vendorUser/verifyStudentQR"
          icon={ScanLine}
        />
        <EventCard
          title="Total Meals Calculator"
          description="Count meals by date and type"
          redirectUrl="/vendorUser/totalMeals"
          icon={UtensilsCrossed}
        />
      </div>
    </div>
  );
};

export default Dashboard;

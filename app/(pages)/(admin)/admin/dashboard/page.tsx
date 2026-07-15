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
  type LucideIcon,
} from "lucide-react";
import EventCard from "@/components/common/EventCard";
import PageHeader from "@/components/common/layout/PageHeader";
import { useUser } from "@/context/UserContext";
import type { AdminAreaRole } from "@/lib/dashboard/navigation";

interface DashboardCard {
  title: string;
  description: string;
  redirectUrl: string;
  icon: LucideIcon;
  roles: AdminAreaRole[];
}

const CARDS: DashboardCard[] = [
  {
    title: "Update Vendor Menu",
    description: "Edit a vendor's menu URL and weekly CSV",
    redirectUrl: "/admin/updateMenu",
    icon: Utensils,
    roles: ["admin", "superAdmin"],
  },
  {
    title: "Choice Analysis",
    description: "Vendor popularity and student picks",
    redirectUrl: "/admin/choiceAnalysis",
    icon: BarChart3,
    roles: ["admin", "superAdmin"],
  },
  {
    title: "Feedback Analysis",
    description: "Aggregate ratings and comments",
    redirectUrl: "/admin/feedBackAnalysis",
    icon: ClipboardList,
    roles: ["admin", "superAdmin"],
  },
  {
    title: "Controls",
    description: "Toggle feedback window and system flags",
    redirectUrl: "/admin/adminControls",
    icon: Sliders,
    roles: ["admin", "superAdmin"],
  },
  {
    title: "Total Meals",
    description: "Calculate served meals for billing",
    redirectUrl: "/admin/totalMeals",
    icon: UtensilsCrossed,
    roles: ["admin", "superAdmin"],
  },
  // superAdmin-only
  {
    title: "Verify Student QR",
    description: "Scan a student's QR manually",
    redirectUrl: "/admin/verifyStudentQR",
    icon: ScanLine,
    roles: ["superAdmin"],
  },
  {
    title: "Manage Vendors",
    description: "Add, edit details, or remove vendors",
    redirectUrl: "/admin/manageVendor",
    icon: Store,
    roles: ["superAdmin"],
  },
  {
    title: "Upload Vendor Selection",
    description: "Bulk-upload the monthly xlsx",
    redirectUrl: "/admin/uploadVendorSelection",
    icon: Upload,
    roles: ["superAdmin"],
  },
];

const Dashboard = () => {
  const { user } = useUser();
  const role = user?.role;
  const cards = CARDS.filter((card) => role !== undefined && (card.roles as string[]).includes(role));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={role === "superAdmin" ? "Super Admin Dashboard" : "Admin Dashboard"}
        description="Manage menus, selections, and analytics."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <EventCard
            key={card.redirectUrl}
            title={card.title}
            description={card.description}
            redirectUrl={card.redirectUrl}
            icon={card.icon}
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;

"use client";

import React from "react";
import {
  BarChart3,
  ClipboardList,
  ScanLine,
  Sliders,
  Store,
  Users,
  Utensils,
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

// Order is deliberate: the surfaces admins reach for most often come first.
// Descriptions render in EventCard with `truncate`, so keep them to ~50 chars.
const CARDS: DashboardCard[] = [
  {
    title: "Manage Students",
    description: "Opt-ins, vendor changes, meal history & bulk upload",
    redirectUrl: "/admin/manageStudents",
    icon: Users,
    roles: ["superAdmin"],
  },
  {
    title: "Manage Vendors",
    description: "Add or remove vendors, set price, meals & login",
    redirectUrl: "/admin/manageVendor",
    icon: Store,
    roles: ["superAdmin"],
  },
  {
    title: "Analytics",
    description: "Monthly vendor demand and meals served, charted",
    redirectUrl: "/admin/analytics",
    icon: BarChart3,
    roles: ["superAdmin"],
  },
  {
    title: "Controls",
    description: "Feedback toggle, user accounts and roles",
    redirectUrl: "/admin/adminControls",
    icon: Sliders,
    roles: ["admin", "superAdmin"],
  },
  {
    title: "Verify Student QR",
    description: "Scan a student's QR to record their meal",
    redirectUrl: "/admin/verifyStudentQR",
    icon: ScanLine,
    roles: ["superAdmin"],
  },
  {
    title: "Update Vendor Menu",
    description: "Set a vendor's menu URL or upload a weekly CSV",
    redirectUrl: "/admin/updateMenu",
    icon: Utensils,
    roles: ["admin", "superAdmin"],
  },
  {
    title: "Feedback Analysis",
    description: "Ratings and comments by vendor, with averages",
    redirectUrl: "/admin/feedBackAnalysis",
    icon: ClipboardList,
    roles: ["admin", "superAdmin"],
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

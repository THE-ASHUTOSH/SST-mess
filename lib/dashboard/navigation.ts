import {
  BarChart3,
  ClipboardList,
  Home,
  type LucideIcon,
  MessageSquare,
  ScanLine,
  Sliders,
  Store,
  Upload,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";

export type ShellVariant = "student" | "admin" | "vendor";

export interface AppNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  kind?: "route" | "external";
  children?: AppNavItem[];
}

export interface RoleNavConfig {
  role: ShellVariant;
  label: string;
  homeHref: string;
  items: AppNavItem[];
  footerItems?: AppNavItem[];
}

export const roleNavConfig: Record<ShellVariant, RoleNavConfig> = {
  student: {
    role: "student",
    label: "Student",
    homeHref: "/student/dashboard",
    items: [
      {
        id: "student-home",
        label: "Home",
        href: "/student/dashboard",
        icon: Home,
      },
      {
        id: "student-vendors",
        label: "Vendors",
        href: "/student/vendorDetails",
        icon: Store,
      },
      {
        id: "student-feedback",
        label: "Feedback",
        href: "/student/feedback",
        icon: MessageSquare,
      },
    ],
  },
  admin: {
    role: "admin",
    label: "Admin",
    homeHref: "/admin/dashboard",
    items: [
      {
        id: "admin-home",
        label: "Home",
        href: "/admin/dashboard",
        icon: Home,
      },
      {
        id: "admin-verify",
        label: "Verify QR",
        href: "/admin/verifyStudentQR",
        icon: ScanLine,
      },
      {
        id: "admin-update-vendor",
        label: "Update Menu",
        href: "/admin/updateVendorMenu",
        icon: Utensils,
      },
      {
        id: "admin-add-vendor",
        label: "Add Vendor",
        href: "/admin/addVendor",
        icon: Store,
      },
      {
        id: "admin-upload",
        label: "Upload Selection",
        href: "/admin/uploadVendorSelection",
        icon: Upload,
      },
      {
        id: "admin-choice",
        label: "Choice Analysis",
        href: "/admin/choiceAnalysis",
        icon: BarChart3,
      },
      {
        id: "admin-feedback",
        label: "Feedback Analysis",
        href: "/admin/feedBackAnalysis",
        icon: ClipboardList,
      },
      {
        id: "admin-total-meals",
        label: "Total Meals",
        href: "/admin/totalMeals",
        icon: UtensilsCrossed,
      },
      {
        id: "admin-controls",
        label: "Controls",
        href: "/admin/adminControls",
        icon: Sliders,
      },
    ],
  },
  vendor: {
    role: "vendor",
    label: "Vendor",
    homeHref: "/vendorUser/dashboard",
    items: [
      {
        id: "vendor-home",
        label: "Home",
        href: "/vendorUser/dashboard",
        icon: Home,
      },
      {
        id: "vendor-verify",
        label: "Verify QR",
        href: "/vendorUser/verifyStudentQR",
        icon: ScanLine,
      },
      {
        id: "vendor-total-meals",
        label: "Total Meals",
        href: "/vendorUser/totalMeals",
        icon: UtensilsCrossed,
      },
    ],
  },
};

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/student/dashboard") return pathname === "/student/dashboard";
  if (href === "/admin/dashboard") return pathname === "/admin/dashboard";
  if (href === "/vendorUser/dashboard")
    return pathname === "/vendorUser/dashboard";
  return pathname.startsWith(href);
}


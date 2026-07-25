import {
  BarChart3,
  CalendarCheck,
  ClipboardList,
  Home,
  type LucideIcon,
  MessageSquare,
  ScanLine,
  Sliders,
  Store,
  Users,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";

export type ShellVariant = "student" | "admin" | "vendor";

// Within the admin shell, items can be limited to specific roles. superAdmin is a superset:
// it sees every admin item plus its own. An item with no `roles` is visible to the whole shell.
export type AdminAreaRole = "admin" | "superAdmin";

export interface AppNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  kind?: "route" | "external";
  children?: AppNavItem[];
  roles?: AdminAreaRole[];
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
        id: "student-meal-history",
        label: "Meal History",
        href: "/student/mealHistory",
        icon: CalendarCheck,
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
        roles: ["admin", "superAdmin"],
      },
      {
        id: "admin-update-menu",
        label: "Update Menu",
        href: "/admin/updateMenu",
        icon: Utensils,
        roles: ["admin", "superAdmin"],
      },
      {
        id: "admin-analytics",
        label: "Analytics",
        href: "/admin/analytics",
        icon: BarChart3,
        roles: ["superAdmin"],
      },
      {
        id: "admin-feedback",
        label: "Feedback Analysis",
        href: "/admin/feedBackAnalysis",
        icon: ClipboardList,
        roles: ["admin", "superAdmin"],
      },
      {
        id: "admin-controls",
        label: "Controls",
        href: "/admin/adminControls",
        icon: Sliders,
        roles: ["admin", "superAdmin"],
      },
      // superAdmin-only
      {
        id: "admin-verify",
        label: "Verify QR",
        href: "/admin/verifyStudentQR",
        icon: ScanLine,
        roles: ["superAdmin"],
      },
      {
        id: "admin-manage-vendor",
        label: "Manage Vendors",
        href: "/admin/manageVendor",
        icon: Store,
        roles: ["superAdmin"],
      },
      {
        id: "admin-manage-students",
        label: "Manage Students",
        href: "/admin/manageStudents",
        icon: Users,
        roles: ["superAdmin"],
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

// Returns whether a nav item should be shown to a given role. Items without a `roles`
// list are visible to everyone in the shell; otherwise the role must be listed.
export function canAccessNavItem(item: AppNavItem, role: string | undefined): boolean {
  if (!item.roles) return true;
  return role !== undefined && (item.roles as string[]).includes(role);
}

// Produces a role-scoped copy of a nav config (used by the admin shell so admins and
// superAdmins see different item sets from the same source config).
export function filterNavConfigByRole(
  config: RoleNavConfig,
  role: string | undefined,
): RoleNavConfig {
  return {
    ...config,
    items: config.items.filter((item) => canAccessNavItem(item, role)),
    footerItems: config.footerItems?.filter((item) => canAccessNavItem(item, role)),
  };
}


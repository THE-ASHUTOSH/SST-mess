"use client";

import Protected from "./Protected";
import AppLayoutShell from "@/components/common/layout/AppLayoutShell";
import { roleNavConfig, filterNavConfigByRole } from "@/lib/dashboard/navigation";
import { useUser } from "@/context/UserContext";

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useUser();
    // Show only the nav items this role is allowed to see (superAdmin sees all).
    const navConfig = {
        ...filterNavConfigByRole(roleNavConfig.admin, user?.role),
        label: user?.role === "superAdmin" ? "Super Admin" : "Admin",
    };

    return (
        <Protected>
            <AppLayoutShell navConfig={navConfig}>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="max-w-7xl mx-auto">{children}</div>
                </div>
            </AppLayoutShell>
        </Protected>
    );
};

export default AdminLayout;

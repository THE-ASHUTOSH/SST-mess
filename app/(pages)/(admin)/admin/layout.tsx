"use client";

import Protected from "./Protected";
import AppLayoutShell from "@/components/common/layout/AppLayoutShell";
import { roleNavConfig } from "@/lib/dashboard/navigation";

const layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <Protected>
            <AppLayoutShell navConfig={roleNavConfig.admin}>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="max-w-7xl mx-auto">{children}</div>
                </div>
            </AppLayoutShell>
        </Protected>
    );
};

export default layout;

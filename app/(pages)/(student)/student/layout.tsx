"use client";

import Protected from "./Protected";
import { DashboardProvider } from "@/context/DashboardContext";
import { MealQRProvider } from "@/context/MealQRContext";
import AppLayoutShell from "@/components/common/layout/AppLayoutShell";
import { roleNavConfig } from "@/lib/dashboard/navigation";

const layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <Protected>
            <DashboardProvider>
                <MealQRProvider>
                    <AppLayoutShell navConfig={roleNavConfig.student}>
                        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                            <div className="max-w-7xl mx-auto">{children}</div>
                        </div>
                    </AppLayoutShell>
                </MealQRProvider>
            </DashboardProvider>
        </Protected>
    );
};

export default layout;

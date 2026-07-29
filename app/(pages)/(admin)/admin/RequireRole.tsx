"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Per-page role guard for the admin shell. The shell itself (Protected) admits both
 * admin and superAdmin; wrap a page in this to restrict it further (e.g. superAdmin-only
 * pages). A disallowed user is bounced back to the admin dashboard.
 *
 * This is a UX guard — the API's requireRole() is the real security boundary.
 */
const RequireRole: React.FC<{ roles: string[]; children: React.ReactNode }> = ({ roles, children }) => {
    const { user, loading } = useUser();
    const router = useRouter();

    const allowed = !!user && roles.includes(user.role ?? "");

    useEffect(() => {
        if (!loading && !allowed) {
            router.replace("/admin/dashboard");
        }
    }, [loading, allowed, router]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
        );
    }

    if (!allowed) {
        return null;
    }

    return <>{children}</>;
};

export default RequireRole;

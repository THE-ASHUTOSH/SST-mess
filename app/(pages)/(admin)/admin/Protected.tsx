"use client";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useEffect } from 'react'
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

// The admin shell is shared by admin and superAdmin; per-page guards further restrict
// superAdmin-only pages (see RequireRole).
const ADMIN_AREA_ROLES = ["admin", "superAdmin"];

const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useUser();
    const router = useRouter();

    const allowed = !!user && ADMIN_AREA_ROLES.includes(user.role ?? "");

    // Immediate redirect effect
    useEffect(() => {
        if (!loading && !allowed) {
            router.replace('/login');
        }
    }, [loading, allowed, router]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground gap-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
        );
    }

    // Prevent render if not authorized, but let the effect handle redirect
    if (!allowed) {
        return null;
    }
    return (
        <>{children}</>
    )
}

export default Protected
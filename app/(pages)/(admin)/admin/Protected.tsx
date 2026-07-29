"use client";
import React, { useEffect } from 'react'
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import FullScreenLoader from "@/components/common/FullScreenLoader";

// The admin shell is shared by admin and superAdmin; per-page guards further restrict
// superAdmin-only pages (see RequireRole).
const ADMIN_AREA_ROLES = ["admin", "superAdmin"];

const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading, notRegistered } = useUser();
    const router = useRouter();

    const allowed = !!user && ADMIN_AREA_ROLES.includes(user.role ?? "");

    // Immediate redirect effect. An unregistered account gets the explanation screen rather
    // than a login page it has already succeeded at.
    useEffect(() => {
        if (!loading && !allowed) {
            router.replace(notRegistered ? '/noAccess' : '/login');
        }
    }, [loading, allowed, notRegistered, router]);

    // The longest visible wait in the app: shown on every dashboard load while UserContext
    // resolves the account. Same loader as the sign-in flow, so the whole journey reads as one
    // continuous state rather than skeleton bars followed by a different spinner.
    if (loading) {
        return <FullScreenLoader title="Loading your dashboard" detail="Checking your access." />;
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
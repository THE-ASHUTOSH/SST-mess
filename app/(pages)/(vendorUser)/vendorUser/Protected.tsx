"use client";
import React, { useEffect } from 'react'
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import FullScreenLoader from "@/components/common/FullScreenLoader";

const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading, notRegistered } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || user.role !== "vendor")) {
            // Unregistered accounts get the explanation screen, not another login attempt.
            router.replace(notRegistered ? '/noAccess' : '/login');
        }
    }, [loading, user, notRegistered, router]);

    // The longest visible wait in the app: shown on every dashboard load while UserContext
    // resolves the account. Same loader as the sign-in flow, so the whole journey reads as one
    // continuous state.
    if (loading) {
        return <FullScreenLoader title="Loading your dashboard" detail="Checking your access." />;
    }

    if (!user || user.role !== "vendor") {
        return null;
    }
    return (
        <>{children}</>
    )
}

export default Protected
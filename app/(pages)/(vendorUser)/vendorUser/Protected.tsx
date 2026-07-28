"use client";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useEffect } from 'react'
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading, notRegistered } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || user.role !== "vendor")) {
            // Unregistered accounts get the explanation screen, not another login attempt.
            router.replace(notRegistered ? '/noAccess' : '/login');
        }
    }, [loading, user, notRegistered, router]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground gap-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
        );
    }

    if (!user || user.role !== "vendor") {
        return null;
    }
    return (
        <>{children}</>
    )
}

export default Protected
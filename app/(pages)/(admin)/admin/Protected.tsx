"use client";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useEffect } from 'react'
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useUser();
    const router = useRouter();

    // useEffect(() => {
    //     if (!loading) {
    //         // require admin role
    //         if (!user || user?.role !== "admin") {
    //             router.push('/login');
    //         }
    //     }
    // }, [loading, user, router]);

    // Immediate redirect effect
    useEffect(() => {
        if (!loading && (!user || user.role !== "admin")) {
            router.replace('/login');
        }
    }, [loading, user, router]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground gap-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
        );
    }

    // Prevent render if not admin, but let the effect handle redirect
    if (!user || user.role !== "admin") {
        return null;
    }
    return (
        <>{children}</>
    )
}

export default Protected
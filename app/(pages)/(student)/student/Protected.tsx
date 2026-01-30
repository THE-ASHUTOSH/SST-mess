"use client";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useUser();
    const router = useRouter();
    // console.log("Protected component rendered with user:", user, "and loading:", loading);
    useEffect(() => {
        if (!loading && (!user || user.role !== "student")) {
            router.replace('/login');
        }
        // console.log("Loading from student", loading);
    }, [loading, user, router]);

    // While verifying, you may display a blank or a loader
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground gap-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
        );
    }
    if (!user || user.role !== "student") {
        return null;
    }
    return (
        <>{children}</>
    )
}

export default Protected
"use client";
import LoadingSpinner from "@/components/common/LoadingAnimation";
import React, { useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

const Protected: React.FC<{children: React.ReactNode}> = ({children}) => {
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#1a1d2e] text-white">
                <LoadingSpinner />
                <p className="mt-4 text-lg">Checking authentication...</p>
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
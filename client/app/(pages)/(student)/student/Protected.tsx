"use client";
import React, { useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

const Protected: React.FC<{children: React.ReactNode}> = ({children}) => {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
            if (!loading && (!user || user.role !== "student")) {
                router.replace('/login');
            }
            console.log("Loading from student", loading);
        }, [loading, user, router]);

    // While verifying, you may display a blank or a loader
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-white">Checking authentication...</div>
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
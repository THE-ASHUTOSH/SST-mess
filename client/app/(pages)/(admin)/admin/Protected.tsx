"use client";
import LoadingSpinner from "@/components/common/LoadingAnimation";
import React,{useEffect} from 'react'
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

const Protected: React.FC<{children: React.ReactNode}> = ({children}) => {
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#1a1d2e] text-white">
                <LoadingSpinner />
                <p className="mt-4 text-lg">Checking authentication...</p>
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
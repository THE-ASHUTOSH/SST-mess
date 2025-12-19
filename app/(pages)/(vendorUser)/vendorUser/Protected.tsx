"use client";
import LoadingSpinner from "@/components/common/LoadingAnimation";
import React,{useEffect} from 'react'
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

const Protected: React.FC<{children: React.ReactNode}> = ({children}) => {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || user.role !== "vendor")) {
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

    if (!user || user.role !== "vendor") {
        return null;
    }
  return (
    <>{children}</>
  )
}

export default Protected
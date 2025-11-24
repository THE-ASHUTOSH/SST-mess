"use client";
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
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-black">Checking authentication...</div>
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
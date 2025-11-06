"use client";
import React,{useEffect} from 'react'
import useUserStore from '@/store/useUserStore'
import { useRouter } from "next/navigation";

const Protected: React.FC<{children: React.ReactNode}> = ({children}) => {
    const user = useUserStore((s: any) => s.user);
    const loading = useUserStore((s: any) => s.loading);
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
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-black">Checking authentication...</div>
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
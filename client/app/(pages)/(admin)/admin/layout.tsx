"use client";

import React, { useEffect } from "react";
import Headers from "@/components/common/Header";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

const layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            // require admin role
            if (!user || user?.role !== "admin") {
                router.push('/login');
            }
        }
    }, [loading, user, router]);

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
        <div className="flex flex-col min-h-screen">
            <Headers />
            <main className="flex-grow container mx-auto px-4 py-8">{children}</main>
        </div>
    );
};

export default layout;

"use client";

import React, { useEffect } from "react";
import Headers from "@/components/common/Header";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

const layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        // if not loading and no user, redirect to login
        if (!loading && !user) {
            router.push('/login');
        }
    }, [loading, user, router]);

    // While verifying, you may display a blank or a loader
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-white">Checking authentication...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-[#1a1c2e] to-gray-950">
            <Headers />
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 ">
                <div className="max-w-7xl mx-auto">{children}</div>
            </main>
        </div>
    );
};

export default layout;

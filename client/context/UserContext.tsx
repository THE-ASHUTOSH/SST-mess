"use client";
import React, { createContext, useState, useEffect, useContext } from "react";

type User = {
    email?: string;
    name?: string;
    picture?: string;
    role?: string;
    roll?: string;
    id?: string;
} | null;

type ContextType = {
    user: User;
    setUser: (u: User) => void;
    loading: boolean;
};

const UserContext = createContext<ContextType>({
    user: null,
    setUser: () => { },
    loading: true,
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function verify() {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/verifyanddetails`, {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (res.status === 401) {
                    if (!mounted) return;
                    setUser(null);
                    return;
                }

                if (!res.ok) {
                    if (!mounted) return;
                    setUser(null);
                    return;
                }

                const data = await res.json();
                if (!mounted) return;
                // backend returns { user }
                setUser(data.user ?? data);
                console.log("User verified:", data.user ?? data);
                console.log("Loading from context", loading);
            } catch (err) {
                console.error("verify error", err);
                if (mounted) setUser(null);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        verify();

        return () => {
            mounted = false;
        };
    }, []);

    return <UserContext.Provider value={{ user, setUser, loading }}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);

export default UserContext;
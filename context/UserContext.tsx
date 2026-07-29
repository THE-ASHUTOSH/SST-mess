"use client";
import React, { createContext, useState, useEffect, useContext } from "react";
import { useUser as useClerkUser, useAuth } from "@clerk/nextjs";
import axios from "axios";

type User = {
  email?: string;
  name?: string;
  picture?: string;
  role?: string;
  roll?: string;
  batch?: string;
  id?: string;
} | null;

type ContextType = {
  user: User;
  setUser: (u: User) => void;
  loading: boolean;
  /** Signed in with Clerk, but no matching row in `users` — show the no-access screen. */
  notRegistered: boolean;
  authError: string | null;
  setAuthError: (error: string | null) => void;
};

const UserContext = createContext<ContextType>({
  user: null,
  setUser: () => { },
  loading: true,
  notRegistered: false,
  authError: null,
  setAuthError: () => { },
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded: clerkLoaded } = useClerkUser();
  const { getToken, signOut } = useAuth();
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [notRegistered, setNotRegistered] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const syncUser = async () => {
      if (!clerkLoaded) return;

      if (clerkUser) {
        const email = clerkUser.primaryEmailAddress?.emailAddress;
        const domain = email?.split('@')[1];
        const allowedDomains = ["sst.scaler.com", "scaler.com"];

        if (domain && !allowedDomains.includes(domain)) {
          // Emit a code, not prose — /login maps it through lib/auth-errors for the copy.
          setAuthError("unauthorized_domain");
          await signOut();
          setUser(null);
          setLoading(false);
          return;
        }

        try {
          // Fetch DB user details to get role and other metadata
          // We use the token to authenticate with our API
          const token = await getToken();

          const res = await axios.get('/api/user/me', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          setUser(res.data?.user ?? null);
          setNotRegistered(false);
        } catch (error) {
          // A row in `users` IS the authorization, so never synthesise a user from Clerk data:
          // a role-less stand-in used to slip past the guards and land admins on the student
          // dashboard. Unknown identity means no user.
          setUser(null);
          setNotRegistered(
            axios.isAxiosError(error) && error.response?.data?.code === 'not_registered',
          );
          if (!axios.isAxiosError(error) || error.response?.status !== 403) {
            console.error("Failed to sync user from DB", error);
          }
        }
      } else {
        setUser(null);
        setNotRegistered(false);
      }
      setLoading(false);
    };

    syncUser();
  }, [clerkUser, clerkLoaded, getToken, signOut]);

  return (
    <UserContext.Provider value={{ user, setUser, loading: loading || !clerkLoaded, notRegistered, authError, setAuthError }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

export default UserContext;

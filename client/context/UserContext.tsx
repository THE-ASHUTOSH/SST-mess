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
  hostel?: string;
  batch?: string;
  id?: string;
  _id?: string;
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
  const { user: clerkUser, isLoaded: clerkLoaded } = useClerkUser();
  const { getToken } = useAuth();
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncUser = async () => {
      if (!clerkLoaded) return;

      if (clerkUser) {
        try {
          // Fetch DB user details to get role and other metadata
          // We use the token to authenticate with our API
          const token = await getToken();
          console.log("Token: ", token);

          // If we have a token, we can call our API
          // Note: axiosInstance might not be ready if it depends on this context or something else
          // So we use fetch or direct axios with header

          const res = await axios.get('/api/user/me', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (res.data && res.data.user) {
            setUser(res.data.user);
          } else {
            // Fallback to clerk data if DB sync fails but we have clerk user
            setUser({
              email: clerkUser.primaryEmailAddress?.emailAddress,
              name: clerkUser.fullName || '',
              picture: clerkUser.imageUrl,
              id: clerkUser.id
            });
          }

        } catch (error) {
          console.error("Failed to sync user from DB", error);
          // Fallback
          setUser({
            email: clerkUser.primaryEmailAddress?.emailAddress,
            name: clerkUser.fullName || '',
            picture: clerkUser.imageUrl,
            id: clerkUser.id
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    syncUser();
  }, [clerkUser, clerkLoaded, getToken]);

  return (
    <UserContext.Provider value={{ user, setUser, loading: loading || !clerkLoaded }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

export default UserContext;

"use client";
import axiosInstance from "../lib/axiosInstance";
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
  setUser: () => {},
  loading: true,
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
useEffect(() => {
  let mounted = true;

  const verify = async () => {
    try {
      const res = await axiosInstance.get(`/auth/verifyanddetails`);

      if (!mounted) return;

      setUser(res.data.user ?? res.data);
    } catch {
      if (mounted) setUser(null);
    } finally {
      if (mounted) setLoading(false);
    }
  };

  verify();
  return () => { mounted = false };
}, []);


  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

export default UserContext;

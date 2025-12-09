"use client";
import { getUserFromToken } from '@/lib/auth';
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
    // Get user data directly from JWT payload
    // The role in the JWT is cryptographically signed and cannot be tampered with
    // Even if someone modifies it client-side, the backend will reject the request
    const tokenUser = getUserFromToken();
    
    if (tokenUser) {
      setUser(tokenUser);
    } else {
      setUser(null);
    }
    
    setLoading(false);
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

export default UserContext;


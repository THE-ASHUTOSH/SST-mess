"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import axiosInstance from "@/lib/axiosInstance";

export default function AuthPage() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const router = useRouter();
  const { setUser } = useUser();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      router.push("/login");
      return;
    }

    // Exchange the short-lived auth code for the actual token
    const exchangeCode = async () => {
      try {
        const response = await axiosInstance.post("/auth/exchange-code", { code });
        const { token } = response.data;

        if (!token) {
          throw new Error("No token received");
        }

        // Store expiry in localStorage (token is in httpOnly cookie, not accessible via JS)
        const expiry = new Date().getTime() + 8 * 60 * 60 * 1000;
        localStorage.setItem("expiry", expiry.toString());
        // Store token for axios interceptor (needed for API calls)
        localStorage.setItem("token", token);

        // Decode the JWT payload to get user info (including role)
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = parts[1];
          const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
          
          setUser({
            id: decoded.id,
            email: decoded.email,
            name: decoded.name,
            picture: decoded.picture,
            role: decoded.role,
            roll: decoded.roll,
          });
          
          // Route based on role from signed JWT
          const userRole = decoded.role;
          router.push(
            userRole === "admin"
              ? "/admin/dashboard"
              : userRole === "vendor"
              ? "/vendorUser/dashboard"
              : "/student/dashboard"
          );
        } else {
          throw new Error("Invalid token format");
        }
      } catch (err) {
        console.error("Auth code exchange failed:", err);
        setError("Authentication failed. Please try again.");
        setTimeout(() => router.push("/login"), 2000);
      }
    };

    exchangeCode();
  }, [code, router, setUser]);

  if (error) {
    return <h1 style={{ color: 'red' }}>{error}</h1>;
  }

  return <h1>Redirecting...</h1>;
}


"use client";

import { useUser } from "@/context/UserContext";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Prevent page caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AuthPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const { setUser } = useUser();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      console.error("No token provided");
      router.replace("/login");
      return;
    }

    const verifyUser = async () => {
      try {
        console.log("Verifying token...");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/verifyandsetcookies`,
          {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              // Prevent caching
              "Cache-Control": "no-cache",
              "Pragma": "no-cache"
            },
            body: JSON.stringify({ token }),
            credentials: "include",
          }
        );

        const data = await response.json();
        console.log("Verification response:", { status: response.status, data });

        if (response.ok && data.user) {
          setUser(data.user);
          const userRole = data.user.role;
          console.log("User verified, role:", userRole);
          
          // Use router.replace instead of redirect for client-side navigation
          router.replace(userRole === "admin" ? "/admin/dashboard" : "/student/dashboard");
        } else {
          console.error("Verification failed:", data);
          setError(data.error || "Failed to verify user");
          router.replace("/login");
        }
      } catch (err) {
        console.error("Verification error:", err);
        setError("An error occurred during verification");
        router.replace("/login");
      }
    };

    verifyUser();
  }, [token, router, setUser]);

  return <h1>Redirecting...</h1>;
}

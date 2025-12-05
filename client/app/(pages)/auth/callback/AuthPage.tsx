"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/context/UserContext";

export default function AuthPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const { setUser } = useUser();

  useEffect(() => {
    if (!token) {
      // Handle case where token is not present
      router.push("/login");
      return;
    }

    // Set the cookie
    document.cookie = `token=${token}; path=/; max-age=${8 * 60 * 60}; SameSite=None; Secure`;

    const fetchUserDetails = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/verifyandsetcookies`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
            credentials: "include",
          }
        );

        if (!response.ok) {
          alert("Unauthorized access. Please log in again.");
          return router.push("/login");
        }

        const data = await response.json(); // contains user info
        setUser(data.user);
        const userRole = data.user?.role;
        router.push(
          userRole === "admin"
            ? "/admin/dashboard"
            : userRole === "vendor"
            ? "/vendorUser/dashboard"
            : userRole === "student"
            ? "/student/dashboard"
            : "/login"
        );
      } catch {
        router.push("/login");
      }
    };

    fetchUserDetails();
  }, [token, router, setUser]);

  return <h1>Redirecting...</h1>;
}

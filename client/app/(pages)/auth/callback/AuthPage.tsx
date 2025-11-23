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
    if (!token) return;

    const verifyUser = async () => {
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
        console.log("User role from callback:", userRole);
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

    verifyUser();
  }, [token, router, setUser]);

  return <h1>Redirecting...</h1>;
}

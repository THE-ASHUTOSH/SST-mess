"use client";

import { useSearchParams, useRouter, redirect } from "next/navigation";
import { useEffect } from "react";

export default function AuthPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

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
          return redirect("/login");
        }

        const data = await response.json(); // contains user info
        const userRole = data.user?.role;
        console.log("User role from callback:", userRole);
        redirect(
          userRole === "admin"
          ? "/admin"
          : userRole === "student"
          ? "/student"
          : "/login"
        );
      } catch {
        router.push("/login");
      }
    };

    verifyUser();
  }, [token, router]);

  return <h1>Redirecting...</h1>;
}

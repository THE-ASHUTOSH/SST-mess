"use client";

import { useSearchParams, useRouter } from "next/navigation";
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
        router.push(response.ok ? "/student" : "/login");
        if (!response.ok) {
          alert("Failed to verify user");
        }

      } catch (err) {
        console.error(err);
        router.push("/login");
      }
    };

    verifyUser();
  }, [token, router]);

  return <h1>Redirecting...</h1>;
}

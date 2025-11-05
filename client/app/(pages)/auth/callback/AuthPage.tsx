"use client";

import { useUser } from "@/context/UserContext";
import { useSearchParams, useRouter, redirect } from "next/navigation";
import { useEffect } from "react";

export default function AuthPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const {setUser} = useUser();

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
        // console.log(await response.json());
        if(response.ok){
            const data = await response.json();
            setUser(data.user ?? data)
            const userRole = data.user.role;
            // console.log("User role:", userRole);
            redirect(userRole === "admin" ? "/admin" : userRole === "student" ? "/student" : "/login");
        }
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

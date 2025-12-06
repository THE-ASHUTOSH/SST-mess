"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/context/UserContext";
import axiosInstance from "../../../../lib/axiosInstance";

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
    document.cookie = `token=${token}; path=/; max-age=${8 * 60 * 60}; SameSite=None; Secure;`;
    localStorage.setItem("token", token);
    const expiry = new Date().getTime() + 8 * 60 * 60 * 1000;
    localStorage.setItem("expiry", expiry.toString());

    const fetchUserDetails = async () => {
      try {
        const response = await axiosInstance.post(
          `/auth/verifyandsetcookies`,
          { token }
        );

        const data = response.data; // contains user info
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
        alert("Unauthorized access. Please log in again.");
        router.push("/login");
      }
    };

    fetchUserDetails();
  }, [token, router, setUser]);

  return <h1>Redirecting...</h1>;
}
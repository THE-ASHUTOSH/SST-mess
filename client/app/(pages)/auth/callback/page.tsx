'use client';
import { redirect, useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthPage() {
    const searchParams = useSearchParams();
    const details = searchParams.get('token');
    const router = useRouter();

    useEffect(() => {
        const verifyUser = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/verify`, {
                    method: "POST", 
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ token: details }), 
                    credentials: "include", 
                });
                
                if (response.ok) {
                    
                    // console.log("this is the response",response)
                    router.push('/student');
                } else {
                    router.push("/login")
                    // console.error("Verification failed");
                }
            } catch (error) {
                console.error("Error verifying user:", error);
            }
        };

        verifyUser();
    });

    return <h1>Redirecting...</h1>;
}
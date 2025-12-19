"use client"

import LoadingSpinner from "@/components/common/LoadingAnimation";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import Image from "next/image"
import sstlogo from '@/public/sstlogo.png'
import { useUser } from '@/context/UserContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { SignIn } from "@clerk/nextjs"

const LoginPage = () => {
  const { user, loading, authError, setAuthError } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (authError) {
      alert(authError);
      setAuthError(null);
    }
  }, [authError, setAuthError]);

  useEffect(() => {
    if (!loading && user) {
      // redirect to appropriate dashboard
      if (user.role === 'admin') router.push('/admin/dashboard');
      else if (user.role === 'vendor') router.push('/vendorUser/dashboard');
      else router.push('/student/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#1a1d2e] text-white">
        <LoadingSpinner />
        <p className="mt-4 text-lg">Checking authentication...</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#1a1d2e] text-white">
        <LoadingSpinner />
        <p className="mt-4 text-lg">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 bg-gray-950 border-0 transition-all duration-300 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] p-6 flex flex-col items-center">
        <CardHeader className="space-y-6 w-full flex flex-col items-center">
          <div className="w-full flex justify-center">
            <Image
              src={sstlogo}
              alt="SST Logo"
              width={240}
              height={85}
              className="object-contain"
            />
          </div>
          <div className="text-center space-y-1">
            <CardDescription className="text-blue-500 text-base font-medium">
              +1% Better Everyday ↑ ↑ ↑
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="w-full flex justify-center pt-2">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-transparent shadow-none border-0 ",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "bg-white text-black hover:bg-gray-200",
                formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
                footerActionLink: "text-blue-400 hover:text-blue-300"
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage


"use client"

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import Image from "next/image"
import sstlogo from '@/public/sstlogo.png'
import { useUser } from '@/context/UserContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { SignIn } from "@clerk/nextjs"
import { toast } from "sonner";

const LoginPage = () => {
  const { user, loading, authError, setAuthError } = useUser();
  const router = useRouter();



  useEffect(() => {
    if (authError) {
      toast.error(authError);
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
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
      <Card className="w-full max-w-md mx-4 bg-card border border-border/60 shadow-lg transition-all duration-300 hover:border-primary/40 hover:shadow-xl p-6 flex flex-col items-center rounded-xl">
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


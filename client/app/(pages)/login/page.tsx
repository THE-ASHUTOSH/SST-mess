"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import sstlogo from '@/public/sstlogo.png'
import LoginButton from '../../../components/features/login/LoginBtn' 
import { useUser } from '@/context/UserContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const LoginPage = () => {
  const { user, loading } = useUser();
  const router = useRouter();

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
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-white">Checking authentication...</div>
      </div>
    );
  }
  console.log(" Student ");

  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <Card className="w-full max-w-sm mx-4 bg-gray-950 border-0 transition-all duration-300 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] p-6">
        <CardHeader className="space-y-6">
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
        <CardContent className="space-y-5 pt-2">
          
            <LoginButton />

          <div className="text-sm text-center text-gray-400">
            By continuing, you agree to our{" "}
            <a href="#" className="text-blue-500 hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="text-blue-500 hover:underline">Privacy Policy</a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage

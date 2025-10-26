"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import Image from "next/image"
import goggleLogo from '../../../public/google.png'



const loginButton = () => {
  return (
    <Button 
            variant="outline" 
            className="w-full py-6 text-white bg-zinc-800 hover:bg-zinc-800/80 border-0 transition-all duration-300 text-base"
            onClick={() => {window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/google`}}
          >
            <Image
              src={goggleLogo}
              alt="Google"
              width={40}
              height={40}
              className="mr-3"
            />
            Continue with Google
          </Button>
  )
}

export default loginButton
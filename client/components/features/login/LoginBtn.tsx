"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import Image from "next/image"
import goggleLogo from '../../../public/google.png'
import GoogleButton from 'react-google-button'



const loginButton = () => {
    return (
        <div className="w-full rounded-sm overflow-hidden transition-transform duration-300 hover:scale-103 hover:brightness-105 active:scale-95">
        <GoogleButton
            type="dark"
            label="Continue with Google"
            className=" transition-transform duration-300 hover:scale-125 hover:brightness-110 active:scale-95"
            onClick={() => {
                window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/google`
            }}
            style={{ width: '100%', transition: 'all 0.3s ease', }}
        />
        </div>
    )
}

export default loginButton
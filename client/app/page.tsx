"use client"
import { redirect } from 'next/navigation'
import { Router } from 'next/router'
import React from 'react'
import { useRouter } from 'next/navigation'


const page = () => {
  document.location.href = '/login'
}

export default page
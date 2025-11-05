import { redirect } from 'next/navigation'
import React from 'react'

const page = () => {
  redirect('student/dashboard')
  console.log("redirect('student/dashboard')")
  
  return null
}

export default page

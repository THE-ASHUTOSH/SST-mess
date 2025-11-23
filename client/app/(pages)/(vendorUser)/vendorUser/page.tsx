"use client"
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const VendorPage = () => {
  const router = useRouter()

  useEffect(() => {
    router.replace('/vendorUser/dashboard')
  }, [router])

  return null
}

export default VendorPage

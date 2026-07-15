"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from "@/components/ui/skeleton"
import axiosInstance from '@/lib/axiosInstance'
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface Vendor {
  id: string
  name: string
  menuUrl: string | null
}

const ManageMenu = () => {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedVendorId, setSelectedVendorId] = useState<string>("")
  const [menuUrl, setMenuUrl] = useState<string>("")
  const [menuFile, setMenuFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadVendors = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`/api/vendor/getVendors`)
      if (Array.isArray(response.data.vendors)) {
        setVendors(response.data.vendors)
      }
    } catch (err) {
      console.log(err)
    }
  }, [])

  useEffect(() => {
    loadVendors()
  }, [loadVendors])

  // Prefill on selection only (not on refetch), so a background refresh never clobbers edits.
  const handleSelectVendor = (id: string) => {
    setSelectedVendorId(id)
    const vendor = vendors.find(v => v.id === id)
    setMenuUrl(vendor?.menuUrl ?? "")
    setMenuFile(null)
    setFileKey(k => k + 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVendorId) {
      toast.error("Please select a vendor.")
      return
    }
    setIsSubmitting(true)
    try {
      const body = new FormData()
      body.append('menuUrl', menuUrl)
      if (menuFile) body.append('menuFile', menuFile)

      await axiosInstance.put(`/api/vendor/updateMenu?id=${selectedVendorId}`, body)
      toast.success("Menu updated successfully!", { description: "Changes have been saved." })
      await loadVendors()
    } catch {
      toast.error("Failed to update menu. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <Card className="w-full max-w-md border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Update Menu</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="vendor">Select Vendor</Label>
              <Select value={selectedVendorId} onValueChange={handleSelectVendor} disabled={isSubmitting}>
                <SelectTrigger id="vendor">
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map(option => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedVendorId && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="menuUrl">Menu URL</Label>
                  <Textarea
                    id="menuUrl"
                    name="menuUrl"
                    value={menuUrl}
                    onChange={(e) => setMenuUrl(e.target.value)}
                    placeholder="Enter menu URL"
                    disabled={isSubmitting}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="menuFile">Menu File (CSV)</Label>
                  <Input
                    key={fileKey}
                    type="file"
                    id="menuFile"
                    name="menuFile"
                    onChange={(e) => setMenuFile(e.target.files?.[0] ?? null)}
                    accept=".csv"
                    disabled={isSubmitting}
                    className="cursor-pointer file:cursor-pointer file:text-foreground file:bg-secondary hover:file:bg-secondary/80"
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload a new CSV to replace the weekly menu, or leave empty to only update the URL.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Skeleton className="h-5 w-24" /> : 'Save Menu'}
                </Button>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ManageMenu

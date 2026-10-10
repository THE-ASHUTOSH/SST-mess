"use client"

import React, { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import axiosInstance from '@/lib/axiosInstance'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { CalendarDays, Link2, Store } from "lucide-react"
import MenuDayScroller from "@/components/features/menu/MenuDayScroller"

interface Vendor {
  id: string
  name: string
  menuUrl: string | null
}

/**
 * Menu editing is now day-by-day over a rolling window (see MenuDayScroller), not a CSV upload of a
 * repeating week. The optional menu link stays because students can still download it.
 */
const ManageMenu = () => {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedVendorId, setSelectedVendorId] = useState<string>("")
  const [menuUrl, setMenuUrl] = useState<string>("")
  const [isSavingUrl, setIsSavingUrl] = useState(false)

  const loadVendors = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`/api/vendor/getVendors`)
      if (Array.isArray(response.data.vendors)) setVendors(response.data.vendors)
    } catch {
      toast.error("Failed to load vendors.")
    }
  }, [])

  useEffect(() => {
    loadVendors()
  }, [loadVendors])

  // Prefill on selection only (not on refetch), so a background refresh never clobbers edits.
  const handleSelectVendor = (id: string) => {
    setSelectedVendorId(id)
    setMenuUrl(vendors.find(v => v.id === id)?.menuUrl ?? "")
  }

  const handleSaveUrl = async () => {
    if (!selectedVendorId) return
    setIsSavingUrl(true)
    try {
      // PATCH on the one menu endpoint — the day cards below PUT to the same route.
      await axiosInstance.patch(`/api/vendor/menu?vendorId=${selectedVendorId}`, { menuUrl })
      toast.success("Menu link saved.")
      await loadVendors()
    } catch (err) {
      const msg =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(msg || "Failed to save the menu link.")
    } finally {
      setIsSavingUrl(false)
    }
  }

  const selectedVendor = vendors.find(v => v.id === selectedVendorId)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold text-primary">
            <CalendarDays className="h-6 w-6" /> Update Menu
          </CardTitle>
          <CardDescription>
            Set what each vendor is serving, day by day. Pick a vendor, then use the pencil on any day
            to edit its breakfast, lunch and dinner.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select value={selectedVendorId} onValueChange={handleSelectVendor}>
                <SelectTrigger id="vendor" className="w-full">
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map(v => (<SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {selectedVendorId && (
              <div className="space-y-2">
                <Label htmlFor="menuUrl" className="flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" /> Menu link <span className="text-muted-foreground">(optional)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="menuUrl"
                    value={menuUrl}
                    onChange={e => setMenuUrl(e.target.value)}
                    placeholder="https://…"
                    disabled={isSavingUrl}
                  />
                  <Button variant="outline" onClick={handleSaveUrl} disabled={isSavingUrl}>
                    {isSavingUrl ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedVendorId ? (
        <Card className="border-border bg-card shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Store className="h-5 w-5 text-primary" /> {selectedVendor?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MenuDayScroller vendorId={selectedVendorId} editable />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-border bg-card/60">
          <CardContent className="py-14 text-center">
            <CalendarDays className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Pick a vendor to start</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You&apos;ll get a card per day — today first, then the next two weeks.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ManageMenu

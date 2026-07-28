"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from "@/components/ui/skeleton"
import axiosInstance from '@/lib/axiosInstance'
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import RequireRole from "../RequireRole"

interface Vendor {
  id: string
  name: string
  email: string | null
  description: string | null
  price: number
  breakfast: boolean | null
  lunch: boolean | null
  dinner: boolean | null
}

interface MealsOptions {
  breakfast: boolean
  lunch: boolean
  dinner: boolean
}

interface VendorFormValues {
  name: string
  email: string
  description: string
  price: string
}

// A login account that may be linked to a vendor: role 'vendor', not claimed by another vendor.
interface VendorAccount {
  id: string
  name: string
  email: string
}

const emptyForm: VendorFormValues = { name: '', email: '', description: '', price: '' }
const defaultMeals: MealsOptions = { breakfast: true, lunch: true, dinner: true }

// Radix forbids an empty SelectItem value, so "unlinked" needs a sentinel.
const NO_ACCOUNT = '__none__'

// Prefer the API's message (missing account, wrong role, already linked) over a generic one.
function requestErrorMessage(err: unknown, fallback: string): string {
  const msg =
    typeof err === 'object' && err !== null && 'response' in err
      ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
      : undefined
  return msg || fallback
}

// Build the multipart body shared by the create + update requests. The menu (URL + CSV) is
// managed separately on the Update Menu page, so it is intentionally not part of this form.
function buildRequestBody(values: VendorFormValues, meals: MealsOptions) {
  const body = new FormData()
  body.append('name', values.name)
  body.append('email', values.email)
  body.append('description', values.description)
  body.append('price', values.price)
  body.append('mealsOptions', JSON.stringify(meals))
  return body
}

interface VendorFieldsProps {
  idPrefix: string
  values: VendorFormValues
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  accounts: VendorAccount[]
  onEmailChange: (email: string) => void
  meals: MealsOptions
  onToggleMeal: (key: keyof MealsOptions) => void
  disabled?: boolean
}

// The vendor detail fields, shared by both the Add and Manage tabs.
const VendorFields = ({ idPrefix, values, onChange, accounts, onEmailChange, meals, onToggleMeal, disabled = false }: VendorFieldsProps) => (
  <>
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-name`}>Vendor Name</Label>
      <Input
        type="text"
        id={`${idPrefix}-name`}
        name="name"
        value={values.name}
        onChange={onChange}
        placeholder="Enter vendor name"
        disabled={disabled}
        required
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-email`}>Vendor Login Account</Label>
      <Select
        value={values.email || NO_ACCOUNT}
        onValueChange={value => onEmailChange(value === NO_ACCOUNT ? '' : value)}
        disabled={disabled}
      >
        <SelectTrigger id={`${idPrefix}-email`}>
          <SelectValue placeholder="No account linked" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_ACCOUNT}>No account linked</SelectItem>
          {/* A link whose account was since removed or demoted still has to render, or saving
              the form would silently drop it. */}
          {values.email && !accounts.some(a => a.email === values.email) && (
            <SelectItem value={values.email}>{values.email} (unavailable)</SelectItem>
          )}
          {accounts.map(account => (
            <SelectItem key={account.id} value={account.email}>
              {account.name} — {account.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        The account this vendor signs in with — scopes their scanner &amp; stats to this vendor.
        {accounts.length === 0
          ? ' No unlinked vendor accounts exist yet — create one under Admin Controls → User Management.'
          : ' Only accounts with the vendor role that aren’t already linked elsewhere are listed.'}
      </p>
    </div>

    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-description`}>Description</Label>
      <Textarea
        id={`${idPrefix}-description`}
        name="description"
        value={values.description}
        onChange={onChange}
        placeholder="Enter vendor description"
        disabled={disabled}
        rows={3}
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-price`}>Price</Label>
      <Input
        type="number"
        id={`${idPrefix}-price`}
        name="price"
        value={values.price}
        onChange={onChange}
        placeholder="Enter price"
        disabled={disabled}
        required
      />
    </div>

    <div className="space-y-3">
      <Label>Allowed Meals</Label>
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <Checkbox id={`${idPrefix}-breakfast`} checked={meals.breakfast} onCheckedChange={() => onToggleMeal('breakfast')} disabled={disabled} />
          <Label htmlFor={`${idPrefix}-breakfast`} className="font-normal cursor-pointer">Breakfast</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id={`${idPrefix}-lunch`} checked={meals.lunch} onCheckedChange={() => onToggleMeal('lunch')} disabled={disabled} />
          <Label htmlFor={`${idPrefix}-lunch`} className="font-normal cursor-pointer">Lunch</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id={`${idPrefix}-dinner`} checked={meals.dinner} onCheckedChange={() => onToggleMeal('dinner')} disabled={disabled} />
          <Label htmlFor={`${idPrefix}-dinner`} className="font-normal cursor-pointer">Dinner</Label>
        </div>
      </div>
    </div>

    <p className="text-xs text-muted-foreground">
      The menu (URL &amp; weekly CSV) is edited separately under <span className="font-medium text-foreground">Update Menu</span>.
    </p>
  </>
)

const ManageVendor = () => {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [tab, setTab] = useState<'add' | 'manage'>('add')

  // Add tab state
  const [addForm, setAddForm] = useState<VendorFormValues>(emptyForm)
  const [addMeals, setAddMeals] = useState<MealsOptions>(defaultMeals)
  const [isAdding, setIsAdding] = useState(false)
  const [addAccounts, setAddAccounts] = useState<VendorAccount[]>([])

  // Manage tab needs its own list: it additionally includes the account this vendor already
  // holds, which the Add list deliberately excludes as "taken".
  const [editAccounts, setEditAccounts] = useState<VendorAccount[]>([])

  // Manage tab state
  const [selectedVendorId, setSelectedVendorId] = useState<string>("")
  const [editForm, setEditForm] = useState<VendorFormValues>(emptyForm)
  const [editMeals, setEditMeals] = useState<MealsOptions>(defaultMeals)
  const [isUpdating, setIsUpdating] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadVendors = useCallback(async () => {
    try {
      // superAdmin endpoint — includes the login email so the edit form can prefill it.
      const response = await axiosInstance.get(`/api/admin/vendors`)
      if (Array.isArray(response.data.vendors)) {
        setVendors(response.data.vendors)
      }
    } catch (err) {
      console.log(err)
    }
  }, [])

  // Selectable vendor login accounts. Pass a vendorId when editing so that vendor's own
  // current account stays in the list instead of reading as claimed.
  const loadAccounts = useCallback(async (vendorId?: string): Promise<VendorAccount[]> => {
    try {
      const response = await axiosInstance.get(`/api/admin/vendor-users`, {
        params: vendorId ? { vendorId } : undefined,
      })
      return Array.isArray(response.data.users) ? response.data.users : []
    } catch {
      toast.error("Failed to load vendor accounts.")
      return []
    }
  }, [])

  useEffect(() => {
    loadVendors()
    loadAccounts().then(setAddAccounts)
  }, [loadVendors, loadAccounts])

  // Prefill the edit form when the admin picks a vendor. Driven by the selection event only
  // (NOT by a `vendors` refetch), so a background list refresh never clobbers in-progress edits.
  const handleSelectVendor = (id: string) => {
    setSelectedVendorId(id)
    const vendor = vendors.find(v => v.id === id)
    if (!vendor) return
    loadAccounts(id).then(setEditAccounts)
    setEditForm({
      name: vendor.name,
      email: vendor.email ?? '',
      description: vendor.description ?? '',
      price: vendor.price.toString(),
    })
    setEditMeals({
      breakfast: vendor.breakfast ?? true,
      lunch: vendor.lunch ?? true,
      dinner: vendor.dinner ?? true,
    })
  }

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setAddForm(prev => ({ ...prev, [name]: value }))
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)
    try {
      await axiosInstance.post(`/api/vendor/manageVendor`, buildRequestBody(addForm, addMeals))
      toast.success("Vendor added successfully!")
      // Reset the Add form and refresh the list so it shows up under Manage. The account just
      // used is now claimed, so the options have to be refetched too.
      setAddForm(emptyForm)
      setAddMeals(defaultMeals)
      await loadVendors()
      setAddAccounts(await loadAccounts())
    } catch (err) {
      toast.error(requestErrorMessage(err, "Failed to add vendor. Please try again."))
    } finally {
      setIsAdding(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVendorId) {
      toast.error("Please select a vendor to update.")
      return
    }
    setIsUpdating(true)
    try {
      await axiosInstance.put(`/api/vendor/manageVendor?id=${selectedVendorId}`, buildRequestBody(editForm, editMeals))
      toast.success("Vendor updated successfully!", { description: "Changes have been saved." })
      await loadVendors()
      setAddAccounts(await loadAccounts())
    } catch (err) {
      toast.error(requestErrorMessage(err, "Failed to update vendor. Please try again."))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedVendorId) return
    setIsDeleting(true)
    try {
      await axiosInstance.delete(`/api/vendor/manageVendor?id=${selectedVendorId}`)
      toast.success("Vendor deleted successfully!")
      setDeleteOpen(false)
      setSelectedVendorId("")
      setEditForm(emptyForm)
      setEditMeals(defaultMeals)
      setEditAccounts([])
      await loadVendors()
      // Soft-deleting a vendor releases its account back into the pool.
      setAddAccounts(await loadAccounts())
    } catch (err) {
      toast.error(requestErrorMessage(err, "Failed to delete vendor. Please try again."))
    } finally {
      setIsDeleting(false)
    }
  }

  const selectedVendor = vendors.find(v => v.id === selectedVendorId)

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <Card className="w-full max-w-md border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Manage Vendors</CardTitle>
          {/* Tab switcher */}
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setTab('add')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === 'add' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setTab('manage')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === 'manage' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Manage
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {tab === 'add' ? (
            <form onSubmit={handleAddSubmit} className="space-y-6">
              <VendorFields
                idPrefix="add"
                values={addForm}
                onChange={handleAddChange}
                accounts={addAccounts}
                onEmailChange={(email) => setAddForm(prev => ({ ...prev, email }))}
                meals={addMeals}
                onToggleMeal={(key) => setAddMeals(prev => ({ ...prev, [key]: !prev[key] }))}
                disabled={isAdding}
              />
              <Button
                type="submit"
                disabled={isAdding}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                {isAdding ? <Skeleton className="h-5 w-24" /> : 'Add Vendor'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="vendor">Select Vendor</Label>
                <Select value={selectedVendorId} onValueChange={handleSelectVendor} disabled={isUpdating || isDeleting}>
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
                  <VendorFields
                    key={`edit-${selectedVendorId}`}
                    idPrefix="edit"
                    values={editForm}
                    onChange={handleEditChange}
                    accounts={editAccounts}
                    onEmailChange={(email) => setEditForm(prev => ({ ...prev, email }))}
                    meals={editMeals}
                    onToggleMeal={(key) => setEditMeals(prev => ({ ...prev, [key]: !prev[key] }))}
                    disabled={isUpdating || isDeleting}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                      disabled={isUpdating || isDeleting}
                    >
                      {isUpdating ? <Skeleton className="h-5 w-20" /> : 'Update Vendor'}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setDeleteOpen(true)}
                      disabled={isUpdating || isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </form>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete vendor?</DialogTitle>
            <DialogDescription>
              This will remove <span className="font-semibold text-foreground">{selectedVendor?.name}</span> from
              the active vendor list. Existing meal and feedback records are preserved. This action cannot be undone
              from the UI.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete Vendor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const ManageVendorPage = () => (
  <RequireRole roles={["superAdmin"]}>
    <ManageVendor />
  </RequireRole>
)

export default ManageVendorPage

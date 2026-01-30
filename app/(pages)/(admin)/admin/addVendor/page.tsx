"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from "@/components/ui/skeleton";
import axiosInstance from '@/lib/axiosInstance';
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from 'next/navigation'

const AddVendor = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    menuUrl: ''
  });
  const [mealsOptions, setMealsOptions] = useState({
    breakfast: true,
    lunch: true,
    dinner: true
  });
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCheckboxChange = (key: keyof typeof mealsOptions) => {
    setMealsOptions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setMenuFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true);
    try {
      const requestBody = new FormData();
      requestBody.append('name', formData.name);
      requestBody.append('description', formData.description);
      requestBody.append('price', formData.price);
      requestBody.append('menuUrl', formData.menuUrl);
      requestBody.append('mealsOptions', JSON.stringify(mealsOptions));
      if (menuFile) {
        requestBody.append('menuFile', menuFile);
      }

      await axiosInstance.post(`/api/vendor/addVendor`, requestBody);
      toast.success("Vendor added successfully!", {
        description: "Redirecting to dashboard...",
      });
      setTimeout(() => router.push("/admin/dashboard"), 1500);

    } catch (error) {
      toast.error("Failed to add vendor. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <Card className="w-full max-w-md border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">
            Add New Vendor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Vendor Name</Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter vendor name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter vendor description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="Enter price"
                required
              />
            </div>

            <div className="space-y-3">
              <Label>Allowed Meals</Label>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox id="breakfast" checked={mealsOptions.breakfast} onCheckedChange={() => handleCheckboxChange('breakfast')} />
                  <Label htmlFor="breakfast" className="font-normal cursor-pointer">Breakfast</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="lunch" checked={mealsOptions.lunch} onCheckedChange={() => handleCheckboxChange('lunch')} />
                  <Label htmlFor="lunch" className="font-normal cursor-pointer">Lunch</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="dinner" checked={mealsOptions.dinner} onCheckedChange={() => handleCheckboxChange('dinner')} />
                  <Label htmlFor="dinner" className="font-normal cursor-pointer">Dinner</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="menuUrl">Menu URL</Label>
              <Textarea
                id="menuUrl"
                name="menuUrl"
                value={formData.menuUrl}
                onChange={handleInputChange}
                placeholder="Enter menu URL"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="menuFile">Menu File (CSV)</Label>
              <Input
                type="file"
                id="menuFile"
                name="menuFile"
                onChange={handleFileChange}
                accept=".csv"
                className="cursor-pointer file:cursor-pointer file:text-foreground file:bg-secondary hover:file:bg-secondary/80"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              {isSubmitting ? <Skeleton className="h-5 w-24" /> : 'Add Vendor'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default AddVendor
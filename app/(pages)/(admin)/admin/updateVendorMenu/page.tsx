"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from "@/components/ui/skeleton";
import axiosInstance from '@/lib/axiosInstance';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useRouter } from 'next/navigation'

interface Vendor {
  id: string;
  name: string;
  price: number;
  description: string;
  menuUrl: string;
  mealsOptions: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };
}

const UpdateVendorMenu = () => {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    menuUrl: ''
  })
  const [mealsOptions, setMealsOptions] = useState({
    breakfast: true,
    lunch: true,
    dinner: true
  });
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadVendors() {
      try {
        const response = await axiosInstance.get(`/api/vendor/getVendors`);
        if (Array.isArray(response.data.vendors)) {
          setVendors(response.data.vendors);
        }
      } catch (err) {
        console.log(err);
      }
    }

    loadVendors();
  }, []);

  useEffect(() => {
    const vendor = vendors.find(v => v.id === selectedVendor);
    if (vendor) {
      setFormData({
        name: vendor.name,
        description: vendor.description,
        price: vendor.price.toString(),
        menuUrl: vendor.menuUrl
      });
      if (vendor.mealsOptions) {
        setMealsOptions(vendor.mealsOptions);
      }
    }
  }, [selectedVendor, vendors]);

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
    if (!selectedVendor) {
      toast.error("Please select a vendor to update.");
      return;
    }
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

      await axiosInstance.put(`/api/vendor/updateVendor/${selectedVendor}`, requestBody);
      toast.success("Vendor updated successfully!", {
        description: "Changes have been saved."
      });
      setTimeout(() => router.push("/admin/dashboard"), 1500);

    } catch (error) {
      toast.error("Failed to update vendor. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">
            Update Vendor Menu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="vendor">Select Vendor</Label>
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
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

            {selectedVendor && (
              <>
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
                  <Label htmlFor="menuFile">Menu File</Label>
                  <Input
                    type="file"
                    id="menuFile"
                    name="menuFile"
                    onChange={handleFileChange}
                    accept=".csv"
                    className="cursor-pointer file:cursor-pointer file:text-foreground file:bg-secondary hover:file:bg-secondary/80"
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              disabled={!selectedVendor || isSubmitting}
            >
              {isSubmitting ? <Skeleton className="h-5 w-28" /> : 'Update Vendor'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default UpdateVendorMenu
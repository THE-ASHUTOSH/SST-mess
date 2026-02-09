'use client';

import React, { useState, useEffect } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import { isAxiosError } from 'axios';

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';

interface Vendor {
    id: string;
    name: string;
}

const TotalMealsPage = () => {
    const [date, setDate] = useState<string>('');
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [selectedVendor, setSelectedVendor] = useState<string>('');
    const [mealType, setMealType] = useState<string>('');
    const [count, setCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchVendors = async () => {
            try {
                const response = await axiosInstance.get('/api/vendor/getVendors');
                if (response.data.success && Array.isArray(response.data.vendors)) {
                    setVendors(response.data.vendors);

                    // Recover saved vendor choice
                    const savedVendorId = localStorage.getItem('selectedVendorId');
                    if (savedVendorId) {
                        const vendorExists = response.data.vendors.some((v: Vendor) => v.id === savedVendorId);
                        if (vendorExists) {
                            setSelectedVendor(savedVendorId);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch vendors", err);
                toast.error("Failed to fetch vendors");
            }
        };
        fetchVendors();

        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        setDate(today);
    }, []);

    const handleCalculate = async () => {
        if (!date || !selectedVendor || !mealType) {
            toast.error("Please fill all fields");
            return;
        }

        setLoading(true);
        setError('');
        setCount(null);

        try {
            const response = await axiosInstance.post('/api/meal/total-meals', {
                date,
                vendorId: selectedVendor,
                mealType
            });

            if (response.data.success) {
                setCount(response.data.count);
                toast.success("Calculation complete");
            } else {
                setError(response.data.message || "Failed to calculate");
                toast.error(response.data.message || "Failed to calculate");
            }
        } catch (err: unknown) {
            console.error("Calculation error", err);
            let msg = "An error occurred";
            if (isAxiosError(err) && err.response?.data?.message) {
                msg = err.response.data.message;
            } else if (err instanceof Error) {
                msg = err.message;
            }
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-start min-h-[calc(100vh-4rem)] bg-background p-4 sm:p-8">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center text-primary">Total Meals Calculator</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Date Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="date-input">Select Date</Label>
                        <Input
                            id="date-input"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full"
                        />
                    </div>

                    {/* Vendor Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="vendor-select">Select Vendor</Label>
                        <Select
                            value={selectedVendor}
                            onValueChange={(value) => {
                                setSelectedVendor(value);
                                localStorage.setItem('selectedVendorId', value);
                            }}
                        >
                            <SelectTrigger id="vendor-select">
                                <SelectValue placeholder="Choose a vendor" />
                            </SelectTrigger>
                            <SelectContent>
                                {vendors.map((v) => (
                                    <SelectItem key={v.id} value={v.id}>
                                        {v.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Meal Type Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="meal-type-select">Meal Type</Label>
                        <Select value={mealType} onValueChange={setMealType}>
                            <SelectTrigger id="meal-type-select">
                                <SelectValue placeholder="Choose meal type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="breakfast">Breakfast</SelectItem>
                                <SelectItem value="lunch">Lunch</SelectItem>
                                <SelectItem value="dinner">Dinner</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Calculate Button */}
                    <Button
                        onClick={handleCalculate}
                        className="w-full text-lg font-semibold h-12"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Calculating...
                            </>
                        ) : (
                            "Calculate Total Meals"
                        )}
                    </Button>

                    {/* Result Display */}
                    {(count !== null || error) && (
                        <div className={`mt-6 p-6 rounded-lg text-center animate-in fade-in slide-in-from-bottom-2 ${error ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                            {error ? (
                                <p className="font-medium">{error}</p>
                            ) : (
                                <div>
                                    <p className="text-sm uppercase tracking-wide font-semibold opacity-70 mb-1">Total Meals Recorded</p>
                                    <p className="text-5xl font-extrabold">{count}</p>
                                    <p className="text-xs mt-2 opacity-60">
                                        For {vendors.find(v => v.id === selectedVendor)?.name} on {new Date(date).toLocaleDateString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    );
};

export default TotalMealsPage;

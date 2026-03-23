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

type Period = 'daily' | 'weekly' | 'monthly';

interface Vendor {
    id: string;
    name: string;
}

// Convert YYYY-Wnn to Monday's date (YYYY-MM-DD)
function weekInputToDate(weekStr: string): string {
    const [yearStr, weekPart] = weekStr.split('-W');
    const year = Number(yearStr);
    const week = Number(weekPart);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const dayOfWeek = jan4.getUTCDay() || 7;
    jan4.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
    return jan4.toISOString().split('T')[0];
}

// Convert YYYY-MM to YYYY-MM-01
function monthInputToDate(monthStr: string): string {
    return `${monthStr}-01`;
}

function getDefaultDateValue(period: Period): string {
    const now = new Date();
    if (period === 'daily') {
        return now.toISOString().split('T')[0];
    } else if (period === 'weekly') {
        // Compute ISO week string
        const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    } else {
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
}

function buildResultSubtitle(period: Period, resolvedDate: string, vendorName: string, mealTypeName: string): string {
    const parts = [vendorName, mealTypeName];

    if (period === 'daily') {
        parts.push(new Date(resolvedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }));
    } else if (period === 'weekly') {
        const start = new Date(resolvedDate + 'T00:00:00');
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        parts.push(
            `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
        );
    } else {
        parts.push(new Date(resolvedDate + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));
    }

    return parts.join(' · ');
}

const TotalMealsPage = () => {
    const [period, setPeriod] = useState<Period>('daily');
    const [dateValue, setDateValue] = useState<string>('');
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [selectedVendor, setSelectedVendor] = useState<string>('');
    const [mealType, setMealType] = useState<string>('');
    const [count, setCount] = useState<number | null>(null);
    const [resultSubtitle, setResultSubtitle] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchVendors = async () => {
            try {
                const response = await axiosInstance.get('/api/vendor/getVendors');
                if (response.data.success && Array.isArray(response.data.vendors)) {
                    setVendors(response.data.vendors);

                    const savedVendorId = localStorage.getItem('selectedVendorId');
                    if (savedVendorId) {
                        const vendorExists = response.data.vendors.some((v: Vendor) => v.id === savedVendorId);
                        if (vendorExists) setSelectedVendor(savedVendorId);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch vendors", err);
                toast.error("Failed to fetch vendors");
            }
        };
        fetchVendors();
        setDateValue(getDefaultDateValue('daily'));
    }, []);

    const handlePeriodChange = (newPeriod: Period) => {
        setPeriod(newPeriod);
        setDateValue(getDefaultDateValue(newPeriod));
        setCount(null);
        setError('');
    };

    const handleCalculate = async () => {
        if (!dateValue || !selectedVendor || !mealType) {
            toast.error("Please fill all fields");
            return;
        }

        // Resolve date to YYYY-MM-DD for API
        let resolvedDate: string;
        if (period === 'weekly') {
            resolvedDate = weekInputToDate(dateValue);
        } else if (period === 'monthly') {
            resolvedDate = monthInputToDate(dateValue);
        } else {
            resolvedDate = dateValue;
        }

        setLoading(true);
        setError('');
        setCount(null);

        try {
            const response = await axiosInstance.post('/api/meal/total-meals', {
                date: resolvedDate,
                vendorId: selectedVendor,
                mealType,
                period,
            });

            if (response.data.success) {
                setCount(response.data.count);
                const vendorName = selectedVendor === 'all' ? 'All Vendors' : (vendors.find(v => v.id === selectedVendor)?.name ?? selectedVendor);
                const mealLabel = mealType === 'all' ? 'All Meals' : mealType.charAt(0).toUpperCase() + mealType.slice(1);
                setResultSubtitle(buildResultSubtitle(period, resolvedDate, vendorName, mealLabel));
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

                    {/* Period Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="period-select">Period</Label>
                        <Select value={period} onValueChange={(v) => handlePeriodChange(v as Period)}>
                            <SelectTrigger id="period-select">
                                <SelectValue placeholder="Choose period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Conditional Date Picker */}
                    <div className="space-y-2">
                        <Label htmlFor="date-input">
                            {period === 'daily' ? 'Select Date' : period === 'weekly' ? 'Select Week' : 'Select Month'}
                        </Label>
                        <Input
                            id="date-input"
                            type={period === 'daily' ? 'date' : period === 'weekly' ? 'week' : 'month'}
                            value={dateValue}
                            onChange={(e) => setDateValue(e.target.value)}
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
                                if (value !== 'all') localStorage.setItem('selectedVendorId', value);
                            }}
                        >
                            <SelectTrigger id="vendor-select">
                                <SelectValue placeholder="Choose a vendor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Vendors</SelectItem>
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
                                <SelectItem value="all">All Meals</SelectItem>
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
                                    <p className="text-xs mt-2 opacity-60">{resultSubtitle}</p>
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

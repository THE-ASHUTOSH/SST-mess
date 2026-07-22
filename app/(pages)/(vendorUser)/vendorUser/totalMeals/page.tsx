'use client';

import React, { useState, useEffect } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import { isAxiosError } from 'axios';

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Store } from 'lucide-react';

interface MyVendor {
    id: string;
    name: string;
}

const TotalMealsPage = () => {
    const [date, setDate] = useState<string>('');
    const [myVendor, setMyVendor] = useState<MyVendor | null>(null);
    const [loadingVendor, setLoadingVendor] = useState(true);
    const [mealType, setMealType] = useState<string>('');
    const [count, setCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadMyVendor = async () => {
            try {
                const response = await axiosInstance.get('/api/vendor/my-vendor');
                setMyVendor(response.data.vendor ?? null);
            } catch (err) {
                console.error("Failed to load your vendor", err);
                toast.error("Failed to load your vendor");
            } finally {
                setLoadingVendor(false);
            }
        };
        loadMyVendor();

        // Default date to today
        setDate(new Date().toISOString().split('T')[0]);
    }, []);

    const handleCalculate = async () => {
        if (!myVendor) {
            toast.error("No vendor is linked to your account.");
            return;
        }
        if (!date || !mealType) {
            toast.error("Please select a date and meal type");
            return;
        }

        setLoading(true);
        setError('');
        setCount(null);

        try {
            // No vendorId sent — the server pins stats to THIS vendor account (from the session).
            const response = await axiosInstance.post('/api/meal/total-meals', {
                date,
                mealType,
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

                    {/* Vendor (fixed to this account) */}
                    {loadingVendor ? (
                        <Skeleton className="h-14 w-full rounded-xl" />
                    ) : myVendor ? (
                        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                            <Store className="h-5 w-5 shrink-0 text-primary" />
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">Counting for</p>
                                <p className="truncate text-base font-semibold text-foreground">{myVendor.name}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-center">
                            <p className="text-sm font-medium text-foreground">No vendor is linked to your account.</p>
                            <p className="text-xs text-muted-foreground">Ask an admin to set your vendor&apos;s login email.</p>
                        </div>
                    )}

                    {/* Date Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="date-input">Select Date</Label>
                        <Input
                            id="date-input"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full"
                            disabled={!myVendor}
                        />
                    </div>

                    {/* Meal Type Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="meal-type-select">Meal Type</Label>
                        <Select value={mealType} onValueChange={setMealType} disabled={!myVendor}>
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
                        disabled={loading || !myVendor}
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
                                        For {myVendor?.name} on {new Date(date).toLocaleDateString()}
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

"use client";

import React, { useState, useEffect } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useUser } from "@/context/UserContext";
import UserManagement from "./UserManagement";

const AdminControlsPage = () => {
    const { user } = useUser();
    const [feedbackEnabled, setFeedbackEnabled] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchFeedbackStatus = async () => {
            try {
                setIsLoading(true);
                const response = await axiosInstance.get(`/api/controls/feedback-toggle`);
                setFeedbackEnabled(response.data.enabled);
            } catch (err) {
                setError('Failed to fetch feedback status.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFeedbackStatus();
    }, []);

    const handleToggleFeedback = async (checked: boolean) => {
        try {
            setIsSubmitting(true);
            const response = await axiosInstance.patch(`/api/controls/feedback-toggle`, {});
            setFeedbackEnabled(response.data.enabled);
        } catch (err) {
            setError('Failed to toggle feedback status.');
            // console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center gap-6 p-4 py-8">
            <Card className="w-full max-w-md border-border bg-card shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-primary">
                        Admin Controls
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-24">
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : error ? (
                        <div className="text-center text-destructive">{error}</div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-300 hover:border-emerald-500/30">
                                <div className="space-y-0.5">
                                    <Label htmlFor="feedback-toggle" className="text-base font-semibold">Feedback System</Label>
                                    <p className="text-sm text-muted-foreground">Allow students to submit feedback.</p>
                                </div>
                                {isSubmitting ? (
                                    <Skeleton className="h-6 w-11 rounded-full" />
                                ) : (
                                    <Switch
                                        id="feedback-toggle"
                                        checked={feedbackEnabled || false}
                                        onCheckedChange={handleToggleFeedback}
                                        disabled={isSubmitting}
                                        className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-zinc-300 dark:data-[state=unchecked]:bg-zinc-700 hover:scale-110 transition-all duration-300 shadow-md ring-offset-background"
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* User administration — superAdmin only (the API is also superAdmin-gated). */}
            {user?.role === "superAdmin" && <UserManagement />}
        </div>
    );
};

export default AdminControlsPage;

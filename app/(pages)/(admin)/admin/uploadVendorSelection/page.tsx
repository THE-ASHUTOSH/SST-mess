"use client";

import React, { useState } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import RequireRole from "../RequireRole";

const UploadVendorSelectionPage = () => {
    const [month, setMonth] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!month || !file) {
            toast.error('Please select a month and a file.');
            return;
        }

        try {
            setIsSubmitting(true);

            const formData = new FormData();
            formData.append('month', month);
            formData.append('vendor-selection', file);

            const response = await axiosInstance.post(
                `/api/admin/upload-vendor-selection`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            const { newEntries, duplicates, issues } = response.data;

            toast.success("File uploaded successfully!", {
                description: (
                    <div className="mt-2 text-sm">
                        <p>New Entries: {newEntries}</p>
                        <p>Duplicates: {duplicates}</p>
                        {issues && issues.length > 0 && (
                            <div className="mt-2">
                                <p className="font-semibold text-red-400">Issues:</p>
                                <ul className="list-disc list-inside text-xs text-red-300 max-h-20 overflow-y-auto">
                                    {issues.map((issue: unknown, index: number) => (
                                        <li key={index}>{JSON.stringify(issue)}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ),
                duration: 5000,
            });

        } catch (err) {
            toast.error('Failed to upload vendor selection.');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <Card className="w-full max-w-md border-border bg-card shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-primary">
                        Upload Vendor Selection
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isSubmitting ? (
                        <div className="flex justify-center items-center h-24">
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="month">Month</Label>
                                <Input
                                    id="month"
                                    type="month"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    className="cursor-pointer"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vendor-selection">Vendor Selection File</Label>
                                <Input
                                    id="vendor-selection"
                                    type="file"
                                    onChange={handleFileChange}
                                    accept=".xlsx, .csv"
                                    className="cursor-pointer file:cursor-pointer file:text-foreground file:bg-secondary hover:file:bg-secondary/80"
                                    required
                                />
                            </div>
                            <Button
                                onClick={handleUpload}
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {isSubmitting ? 'Uploading...' : 'Upload'}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const GuardedUploadVendorSelectionPage = () => (
    <RequireRole roles={["superAdmin"]}>
        <UploadVendorSelectionPage />
    </RequireRole>
);

export default GuardedUploadVendorSelectionPage;

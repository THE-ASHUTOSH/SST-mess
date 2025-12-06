"use client";

import React, { useState } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import { isAxiosError } from 'axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LoadingAnimation from '@/components/common/LoadingAnimation';

const UploadVendorSelectionPage = () => {
    const [month, setMonth] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!month || !file) {
            setError('Please select a month and a file.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            setSuccess(null);

            const formData = new FormData();
            formData.append('month', month);
            formData.append('vendor-selection', file);

            const response = await axiosInstance.post(
                `/admin/upload-vendor-selection`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            setSuccess(response.data.message);
            console.log("response",response.data);
        } catch (err) {
            setError('Failed to upload vendor selection.');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4 animate-fade-in-up">
            <Card className="w-full max-w-md bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
                <div className="p-8">
                    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400">
                        Upload Vendor Selection
                    </h1>

                    {isSubmitting ? (
                        <div className="flex justify-center items-center h-24">
                            <LoadingAnimation />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {error && <div className="text-center text-red-400">{error}</div>}
                            {success && <div className="text-center text-green-400">{success}</div>}
                            <div className="space-y-2">
                                <label htmlFor="month" className="text-sm font-medium text-gray-200">
                                    Month
                                </label>
                                <input
                                    id="month"
                                    type="month"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="file" className="text-sm font-medium text-gray-200">
                                    Vendor Selection File
                                </label>
                                <input
                                    id="vendor-selection"
                                    type="file"
                                    onChange={handleFileChange}
                                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    accept=".xlsx, .csv"
                                    required
                                />
                            </div>
                            <Button
                                onClick={handleUpload}
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                {isSubmitting ? 'Uploading...' : 'Upload'}
                            </Button>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default UploadVendorSelectionPage;

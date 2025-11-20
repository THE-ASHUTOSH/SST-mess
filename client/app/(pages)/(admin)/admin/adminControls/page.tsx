"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import LoadingAnimation from '@/components/common/LoadingAnimation';

const AdminControlsPage = () => {
    const [feedbackEnabled, setFeedbackEnabled] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchFeedbackStatus = async () => {
            try {
                setIsLoading(true);
                const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/controls/feedback-toggle`, {
                    withCredentials: true,
                });
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

    const handleToggleFeedback = async () => {
        try {
            setIsSubmitting(true);
            const response = await axios.patch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/controls/feedback-toggle`, {}, {
                withCredentials: true,
            });
            setFeedbackEnabled(response.data.enabled);
        } catch (err) {
            setError('Failed to toggle feedback status.');
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
                        Admin Controls
                    </h1>

                    {isLoading || isSubmitting ? (
                        <div className="flex justify-center items-center h-24">
                            <LoadingAnimation />
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-400">{error}</div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-200">Feedback System</h2>
                                    <p className="text-sm text-gray-400">Allow students to submit feedback.</p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <label htmlFor="feedback-toggle" className="flex items-center cursor-pointer">
                                        <div className="relative">
                                            <input
                                                id="feedback-toggle"
                                                type="checkbox"
                                                className="sr-only"
                                                checked={feedbackEnabled || false}
                                                onChange={handleToggleFeedback}
                                                disabled={isSubmitting}
                                            />
                                            <div className={`block w-14 h-8 rounded-full ${feedbackEnabled ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${feedbackEnabled ? 'transform translate-x-6' : ''}`}></div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default AdminControlsPage;

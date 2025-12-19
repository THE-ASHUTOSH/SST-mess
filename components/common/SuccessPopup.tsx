"use client";

import React from 'react';
import Link from 'next/link';

interface SuccessPopupProps {
    onClose: () => void;
    message: string;
    details?: React.ReactNode;
    link?: {
        href: string;
        text: string;
    };
}

const SuccessPopup: React.FC<SuccessPopupProps> = ({ onClose, message, details, link }) => {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-90 p-4 backdrop-blur-3xl"
            onClick={onClose}
        >
            <div
                className="relative flex flex-col items-center gap-4 rounded-2xl bg-white p-8 shadow-2xl transform animate-in fade-in zoom-in duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
                    <svg
                        className="h-8 w-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </div>
                <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        Success!
                    </h3>
                    <p className="text-gray-600">{message}</p>
                    {details}
                </div>
                {link ? (
                    <Link href={link.href}>
                        <button
                            className="mt-2 px-8 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 active:scale-95 transition-all duration-200 shadow-md"
                            onClick={onClose}
                        >
                            {link.text}
                        </button>
                    </Link>
                ) : (
                    <button
                        className="mt-2 px-8 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 active:scale-95 transition-all duration-200 shadow-md"
                        onClick={onClose}
                    >
                        OK
                    </button>
                )}
            </div>
        </div>
    );
};

export default SuccessPopup;

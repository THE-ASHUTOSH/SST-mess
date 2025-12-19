"use client";

import { useEffect } from 'react';
import LoadingSpinner from '@/components/common/LoadingAnimation';

export default function Page() {
  useEffect(() => {
    window.location.replace('/login');
  }, []);

  return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#1a1d2e] text-white">
        <LoadingSpinner />
        <p className="mt-4 text-lg">Redirecting...</p>
      </div>
    );
}
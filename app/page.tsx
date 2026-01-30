"use client";

import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Page() {
  useEffect(() => {
    window.location.replace('/login');
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground gap-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}
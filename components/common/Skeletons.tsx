"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
    return (
        <div className="p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
            <Skeleton className="h-10 w-48 mx-auto mb-10" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
            </div>
        </div>
    );
}

export function CardSkeleton() {
    return (
        <div className="bg-card border border-border/60 rounded-xl p-6 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
        </div>
    );
}

export function FormSkeleton() {
    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border border-border/60 rounded-xl p-6 space-y-6">
                <Skeleton className="h-8 w-48 mx-auto" />
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    );
}

export function QRSkeleton() {
    return (
        <div className="flex flex-col items-center space-y-6">
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-64 w-64 rounded-xl" />
            <Skeleton className="h-4 w-48" />
        </div>
    );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
            ))}
        </div>
    );
}

export function VendorCardSkeleton() {
    return (
        <div className="bg-card border border-border/60 rounded-xl p-6 space-y-4 mb-4">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
        </div>
    );
}

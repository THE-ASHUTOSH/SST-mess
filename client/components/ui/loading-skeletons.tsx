"use client"

import { Skeleton } from "@/components/ui/skeleton"
import React from "react"

export const MenuCardSkeleton = () => {
  return (
    <div className="w-full h-[300px] bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden p-6 space-y-4">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  )
}

export const VendorCardSkeleton = () => {
  return (
    <div className="w-full h-[200px] bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-full" />
      <div className="flex space-x-1">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-4 w-4" />
        ))}
      </div>
    </div>
  )
}

export const GridSkeleton = ({
  count,
  SkeletonComponent,
}: {
  count: number
  SkeletonComponent: React.ComponentType
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => (
        <SkeletonComponent key={i} />
      ))}
    </div>
  )
}
"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import React from "react"

interface VendorCardProps {
  vendor: {
    id: string
    name: string
    type: string
    rating: number
    description?: string
  }
  isSelected?: boolean
  onClick?: () => void
  className?: string
}

export const VendorCard: React.FC<VendorCardProps> = ({
  vendor,
  isSelected,
  onClick,
  className,
}) => {
  return (
    <Card
      className={cn(
        "w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-purple-500/20 transform hover:-translate-y-1 transition-all duration-300 cursor-pointer",
        isSelected && "ring-2 ring-purple-500",
        className
      )}
      onClick={onClick}
    >
      <div className="p-6">
        <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
          {vendor.name}
        </h3>
        <p className="mt-2 text-sm text-gray-400">{vendor.type}</p>
        {vendor.description && (
          <p className="mt-4 text-sm text-gray-300">{vendor.description}</p>
        )}
        <div className="mt-4 flex items-center">
          <div className="flex items-center">
            {[...Array(5)].map((_, index) => (
              <svg
                key={index}
                className={cn(
                  "w-4 h-4",
                  index < Math.round(vendor.rating)
                    ? "text-yellow-400"
                    : "text-gray-600"
                )}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="ml-2 text-sm text-gray-400">
            {vendor.rating.toFixed(1)}
          </span>
        </div>
      </div>
    </Card>
  )
}
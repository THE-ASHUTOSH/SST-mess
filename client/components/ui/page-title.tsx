"use client"

import { cn } from "@/lib/utils"
import React from "react"

interface PageTitleProps {
  title: string
  description?: string
  className?: string
}

export const PageTitle: React.FC<PageTitleProps> = ({
  title,
  description,
  className,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400">
        {title}
      </h1>
      {description && (
        <p className="text-muted-foreground text-sm md:text-base">
          {description}
        </p>
      )}
    </div>
  )
}
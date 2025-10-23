"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import React from "react"

interface MenuCardProps {
  day: string
  items: string[]
  isToday?: boolean
  className?: string
}

export const MenuCard: React.FC<MenuCardProps> = ({
  day,
  items,
  isToday,
  className,
}) => {
  return (
    <Card
      className={cn(
        "w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg",
        isToday && "ring-2 ring-purple-500/50",
        className
      )}
    >
      <div className="p-6">
        <h3
          className={cn(
            "text-lg font-semibold mb-4",
            isToday
              ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400"
              : "text-gray-200"
          )}
        >
          {day}
          {isToday && " (Today)"}
        </h3>
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={index}
              className="text-gray-300 text-sm flex items-center space-x-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500/50" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
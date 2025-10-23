"use client"

import React, { createContext, useContext, useState } from "react"
import { Vendor, Feedback } from "@/types"

interface StudentData {
  selectedVendor: string | null
  selectedMess: string | null
  feedback: Feedback[]
}

interface DataContextType {
  vendors: Vendor[]
  studentData: StudentData
  setVendors: (vendors: Vendor[]) => void
  setStudentData: (data: Partial<StudentData>) => void
  isLoading: boolean
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [studentData, setStudentData] = useState<StudentData>({
    selectedVendor: null,
    selectedMess: null,
    feedback: [],
  })
  const [isLoading, setIsLoading] = useState(false)

  const updateStudentData = (data: Partial<StudentData>) => {
    setStudentData((prev) => ({ ...prev, ...data }))
  }

  return (
    <DataContext.Provider
      value={{
        vendors,
        studentData,
        setVendors,
        setStudentData: updateStudentData,
        isLoading,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
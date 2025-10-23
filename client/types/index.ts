// Vendor related types
export interface Vendor {
  id: string
  name: string
  type: string
  rating: number
  description?: string
  menu?: Menu[]
}

// Menu related types
export interface MenuItem {
  id: string
  name: string
  description?: string
  price?: number
  type?: string
}

export interface Menu {
  id: string
  day: string
  items: MenuItem[]
  vendorId: string
}

// Student related types
export interface Student {
  id: string
  name: string
  room: string
  selectedVendor?: string
  selectedMess?: string
}

// Feedback related types
export interface Feedback {
  id: string
  vendorId: string
  studentId: string
  rating: number
  comment?: string
  createdAt: string
}

// API response types
export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

// Form data types
export interface MessSelectionFormData {
  name: string
  room: string
  mess: string
}

export interface FeedbackFormData {
  rating: number
  comment?: string
  vendorId: string
}
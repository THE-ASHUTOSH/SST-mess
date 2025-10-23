// API endpoints configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// API endpoints
const ENDPOINTS = {
  vendors: `${API_BASE_URL}/vendors`,
  menu: `${API_BASE_URL}/menu`,
  feedback: `${API_BASE_URL}/feedback`,
  student: `${API_BASE_URL}/student`,
}

// API response types
interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

// API error handling
class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// Generic fetch function with error handling
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new ApiError(response.status, data.message || 'Something went wrong')
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new Error('Network error')
  }
}

// API service methods
export const api = {
  // Vendor related endpoints
  vendors: {
    getAll: () => fetchApi(ENDPOINTS.vendors),
    getById: (id: string) => fetchApi(`${ENDPOINTS.vendors}/${id}`),
    getMenu: (id: string) => fetchApi(`${ENDPOINTS.vendors}/${id}/menu`),
  },

  // Student related endpoints
  student: {
    selectMess: (data: { studentId: string; messId: string }) =>
      fetchApi(ENDPOINTS.student + '/select-mess', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getCurrentSelection: (studentId: string) =>
      fetchApi(`${ENDPOINTS.student}/${studentId}/mess-selection`),
  },

  // Feedback related endpoints
  feedback: {
    submit: (data: { vendorId: string; rating: number; comment?: string }) =>
      fetchApi(ENDPOINTS.feedback, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getByVendor: (vendorId: string) =>
      fetchApi(`${ENDPOINTS.feedback}/vendor/${vendorId}`),
  },

  // Menu related endpoints
  menu: {
    getByVendor: (vendorId: string) => fetchApi(`${ENDPOINTS.menu}/${vendorId}`),
    getToday: () => fetchApi(`${ENDPOINTS.menu}/today`),
  },
}
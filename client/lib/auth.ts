// lib/auth.ts

// Function to get the token from cookies or localStorage
export function getToken(): string | null {
    // Check if localStorage is available
    if (typeof window !== 'undefined' && window.localStorage) {
        const token = localStorage.getItem("token");
        const expiry = localStorage.getItem("expiry");

        if (token && expiry && new Date().getTime() < Number(expiry)) {
            return token;
        }
    }

    // Fallback to cookies
    if (typeof document !== 'undefined') {
        const cookie = document.cookie.split(';').find(c => c.trim().startsWith('token='));
        if (cookie) {
            return cookie.split('=')[1];
        }
    }

    return null;
}

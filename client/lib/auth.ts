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
        // console.log(document.cookie.split(';'));
        const cookie = document.cookie.split(';').find(c => c.trim().startsWith('token='));
        if (cookie) {
            return cookie.split('=')[1];
        }
    }

    return null;
}

export function decodeToken(): { 
    id?: string; 
    email?: string; 
    name?: string; 
    picture?: string; 
    role?: string;
    roll?: string;
    exp?: number;
} | null {
    const token = getToken();
    if (!token) return null;

    try {
        // JWT format: header.payload.signature
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        // Decode the payload (second part) from Base64
        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

/**
 * Get user info from JWT payload
 * This is the single source of truth for user data on the frontend
 */
export function getUserFromToken() {
    const decoded = decodeToken();
    if (!decoded) return null;
    
    // Check if token is expired
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        return null;
    }

    return {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        role: decoded.role,
        roll: decoded.roll,
    };
}

import jwt from "jsonwebtoken";

/**
 * Role-based authorization middleware
 * Verifies JWT signature and checks role from the signed payload
 * 
 * IMPORTANT: This uses jwt.verify() which validates the cryptographic signature!
 * If anyone tampers with the payload (including role), the signature check fails.
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        let token = null;
        
        if (req.cookies?.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ message: "Unauthorized: No token provided" });
        }

        try {
            // jwt.verify() validates the signature - tampered tokens are rejected
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            
            if (!decoded.role || !allowedRoles.includes(decoded.role)) {
                return res.status(403).json({ 
                    message: "Forbidden: Insufficient permissions" 
                });
            }

            // Attach decoded user info to request for downstream use
            // Using req.user for backward compatibility with existing controllers
            req.user = decoded;
            req.tokenUser = decoded;
            next();
        } catch (err) {
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: "Unauthorized: Invalid token" });
            }
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: "Unauthorized: Token expired" });
            }
            console.error("Role auth middleware error:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    };
}

// Convenience exports for common role requirements
const requireAdmin = requireRole('admin');
const requireVendor = requireRole('vendor', 'admin');  // Admin can also access vendor routes
const requireStudent = requireRole('student', 'vendor', 'admin');  // All authenticated users

export { requireRole, requireAdmin, requireVendor, requireStudent };

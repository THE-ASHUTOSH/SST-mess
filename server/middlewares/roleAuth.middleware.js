function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ message: "Unauthorized: User data not available" });
        }

        const { role } = req.user;

        if (!allowedRoles.includes(role)) {
            return res.status(403).json({ 
                message: "Forbidden: Insufficient permissions" 
            });
        }

        next();
    };
}

// Convenience exports for common role requirements
const requireAdmin = requireRole('admin');
const requireVendor = requireRole('vendor', 'admin');  // Admin can also access vendor routes
const requireStudent = requireRole('student', 'vendor', 'admin');  // All authenticated users

export { requireRole, requireAdmin, requireVendor, requireStudent };

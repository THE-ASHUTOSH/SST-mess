import jwt from "jsonwebtoken";

/**
 * Generate a JWT token with user info and role
 * @param {Object} user - User data (id, email, name, picture)
 * @param {string} role - User's role (admin, vendor, student)
 * @returns {string} Signed JWT token
 */
const generateToken = (user, role) => {
  return jwt.sign({ ...user, role }, process.env.JWT_SECRET_KEY, { expiresIn: "8h" });
}

export { generateToken };
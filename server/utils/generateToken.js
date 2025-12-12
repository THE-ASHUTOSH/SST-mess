import jwt from "jsonwebtoken";

const generateToken = (user, role) => {
  return jwt.sign({ ...user, role }, process.env.JWT_SECRET_KEY, { expiresIn: "8h" });
}

export { generateToken };
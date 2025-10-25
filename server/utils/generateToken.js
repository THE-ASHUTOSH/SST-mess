import jwt from "jsonwebtoken";

const generateToken = (user) => {
  return jwt.sign(user, "your_jwt_secret_key", { expiresIn: "1h" });
}

export { generateToken };
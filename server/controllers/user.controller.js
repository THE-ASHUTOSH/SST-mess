import jwt from "jsonwebtoken";
function getUserDetails(req, res) {
    console.log(req.cookies);
    if (!req.cookies?.token) {
        // res.redirect('http://localhost:3000/login')
        return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.cookies && req.cookies.token) {
        const user = jwt.verify(req.cookies.token, "your_jwt_secret_key");
        return res.status(201).json({ user });
    }
    res.json();
}



export { getUserDetails };
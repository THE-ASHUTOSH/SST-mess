function getUserDetails(req, res) {
    if (!req.cookies?.token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.cookies && req.cookies.token) {
        const user = jwt.verify(req.cookies.token, "your_jwt_secret_key");
        return res.json({ user });
    }
    res.json();
}



export { getUserDetails };
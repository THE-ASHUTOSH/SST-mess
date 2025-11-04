import jwt from "jsonwebtoken";
function verifyAndSendDetails(req, res) {
    console.log(req.cookies);
    if (!req.cookies?.token) {
        // res.redirect('http://localhost:3000/login')
        return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.cookies && req.cookies.token) {
        const user = jwt.verify(req.cookies.token, process.env.JWT_SECRET_KEY);
        return res.status(201).json({ user });
    }
    res.json();
}

function verifyAndSetCookies(req, res) {
    if (!req.body.token) {
        return res.status(400).json({ error: "No token provided" });
    }

    jwt.verify(req.body.token, process.env.JWT_SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(401).json({ error: "Invalid token" });
        }

        console.log(user);
        res.cookie('token', req.body.token, { httpOnly: true, secure: true, sameSite: 'none',});
        return res.status(201).json({ user });
    });
}

export { verifyAndSendDetails, verifyAndSetCookies };

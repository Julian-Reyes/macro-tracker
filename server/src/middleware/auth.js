import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

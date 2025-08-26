export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Invalid token" });

  // TODO: verify token using JWT in production
  req.user = { id: "dummyUserId" }; // replace with real user ID after verification
  next();
};

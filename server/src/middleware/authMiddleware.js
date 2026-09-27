import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Not authorized. Please log in.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

// Like `protect`, but never rejects the request: decodes the bearer token
// and sets req.user when a valid one is present, otherwise just proceeds
// anonymously. Used on public routes (e.g. product detail) that should stay
// accessible to anonymous visitors while still attributing interactions to
// logged-in users when possible (T3.1 view tracking).
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // Invalid/expired token - proceed as anonymous rather than blocking.
    }
  }

  next();
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      message: "You are not authorized to perform this action",
    });
  }

  next();
};
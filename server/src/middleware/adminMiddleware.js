export function requireProductAdmin(req, res, next) {
  if (req.user?.role === 'admin') {
    return next();
  }

  const adminKey = req.headers['x-admin-key'];
  const configuredKey = process.env.ADMIN_API_KEY;

  if (configuredKey && adminKey && adminKey === configuredKey) {
    return next();
  }

  return res.status(403).json({ message: 'Admin privileges required.' });
}
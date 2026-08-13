import jwt from 'jsonwebtoken';

const DEFAULT_SECRET = 'dev-secret-not-for-production';

function getSecret() {
  return process.env.JWT_SECRET || DEFAULT_SECRET;
}

export function signAuthToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role ?? 'user'
    },
    getSecret(),
    { expiresIn: '7d' }
  );
}

export function verifyAuthToken(token) {
  return jwt.verify(token, getSecret());
}
import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail, findUserById, publicUser } from '../services/authStore.js';
import { signAuthToken } from '../services/tokenService.js';

function normalizeAuthPayload(body = {}) {
  return {
    name: String(body.name ?? '').trim(),
    email: String(body.email ?? '').trim().toLowerCase(),
    password: String(body.password ?? '')
  };
}

function buildAuthResponse(user) {
  return {
    user: publicUser(user),
    token: signAuthToken(user)
  };
}

export async function register(req, res) {
  const payload = normalizeAuthPayload(req.body);

  if (!payload.name || !payload.email || payload.password.length < 8) {
    return res.status(400).json({ message: 'Name, email, and a password with at least 8 characters are required.' });
  }

  const existingUser = await findUserByEmail(payload.email);

  if (existingUser) {
    return res.status(409).json({ message: 'An account with that email already exists.' });
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const user = await createUser({ name: payload.name, email: payload.email, passwordHash });

  return res.status(201).json(buildAuthResponse(user));
}

export async function login(req, res) {
  const payload = normalizeAuthPayload(req.body);

  if (!payload.email || !payload.password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = await findUserByEmail(payload.email);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const passwordMatches = await bcrypt.compare(payload.password, user.passwordHash);

  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  return res.json(buildAuthResponse(user));
}

export async function me(req, res) {
  const user = await findUserById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json({ user: publicUser(user) });
}
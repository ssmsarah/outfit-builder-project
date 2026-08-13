import mongoose from 'mongoose';
import User from '../models/User.js';

const memoryUsers = [];

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role ?? 'user',
    createdAt: user.createdAt ?? new Date().toISOString()
  };
}

export async function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (mongoose.connection.readyState === 1) {
    return User.findOne({ email: normalizedEmail });
  }

  return memoryUsers.find((user) => user.email === normalizedEmail) ?? null;
}

export async function findUserById(userId) {
  if (mongoose.connection.readyState === 1) {
    return User.findById(userId);
  }

  return memoryUsers.find((user) => String(user._id) === String(userId)) ?? null;
}

export async function createUser({ name, email, passwordHash }) {
  const normalizedEmail = normalizeEmail(email);

  if (mongoose.connection.readyState === 1) {
    return User.create({ name, email: normalizedEmail, passwordHash });
  }

  const user = {
    _id: `user-${Date.now()}`,
    name,
    email: normalizedEmail,
    passwordHash,
    role: 'user',
    createdAt: new Date().toISOString()
  };

  memoryUsers.unshift(user);
  return user;
}

export function publicUser(user) {
  return sanitizeUser(user);
}
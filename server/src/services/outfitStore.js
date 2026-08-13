import mongoose from 'mongoose';
import Outfit from '../models/Outfit.js';

const memorySavedOutfits = [];
const memoryOrders = [];

function matchesUser(record, userId) {
  return userId ? record.userId === userId : true;
}

export async function persistSavedOutfit(snapshot, userId) {
  if (mongoose.connection.readyState === 1) {
    return Outfit.create(snapshot);
  }

  memorySavedOutfits.unshift({ ...snapshot, userId, _id: `saved-${Date.now()}` });
  return memorySavedOutfits[0];
}

export async function listSavedOutfits(userId) {
  if (mongoose.connection.readyState === 1) {
    const query = userId ? { userId } : {};
    return Outfit.find(query).sort({ createdAt: -1 }).lean();
  }

  return memorySavedOutfits.filter((record) => matchesUser(record, userId));
}

export async function persistOrder(order, userId) {
  if (mongoose.connection.readyState === 1) {
    return Outfit.create(order);
  }

  memoryOrders.unshift({ ...order, userId, _id: `order-${Date.now()}` });
  return memoryOrders[0];
}

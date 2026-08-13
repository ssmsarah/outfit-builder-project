import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { DEMO_PRODUCTS } from '../data/demoCatalog.js';

const memoryProducts = DEMO_PRODUCTS.map((product) => ({
  ...product,
  sourceId: product.id,
  sku: '',
  slug: product.id,
  genderTarget: 'unisex',
  fabricWeight: '',
  material: '',
  sizes: [],
  colors: [product.color],
  image: product.image ?? '',
  images: product.image ? [product.image] : [],
  inventoryCount: 12,
  rating: 0,
  isActive: true
}));

function toPlainProduct(product) {
  if (!product) {
    return null;
  }

  const sourceId = String(product.sourceId ?? product.id ?? product._id);

  return {
    id: sourceId,
    sourceId,
    sku: product.sku ?? '',
    slug: product.slug ?? sourceId,
    name: product.name,
    brand: product.brand,
    category: product.category,
    subCategory: product.subCategory ?? '',
    genderTarget: product.genderTarget ?? 'unisex',
    price: Number(product.price ?? 0),
    color: product.color ?? '',
    colorFamily: product.colorFamily ?? '',
    styleTags: Array.isArray(product.styleTags) ? product.styleTags : [],
    season: Array.isArray(product.season) ? product.season : [],
    occasion: Array.isArray(product.occasion) ? product.occasion : [],
    fitType: product.fitType ?? '',
    fabricWeight: product.fabricWeight ?? '',
    material: product.material ?? '',
    sizes: Array.isArray(product.sizes) ? product.sizes : [],
    colors: Array.isArray(product.colors) ? product.colors : [],
    image: product.image ?? product.images?.[0] ?? '',
    images: Array.isArray(product.images) ? product.images : product.image ? [product.image] : [],
    inventoryCount: Number(product.inventoryCount ?? 0),
    rating: Number(product.rating ?? 0),
    isActive: Boolean(product.isActive ?? true),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
}

function toStoredProduct(payload) {
  const sourceId = String(payload.sourceId ?? payload.id ?? payload.slug ?? payload.name ?? `product-${Date.now()}`).trim();

  return {
    sourceId,
    sku: String(payload.sku ?? '').trim(),
    slug: String(payload.slug ?? sourceId).trim(),
    name: String(payload.name ?? '').trim(),
    brand: String(payload.brand ?? '').trim(),
    category: String(payload.category ?? '').trim(),
    subCategory: String(payload.subCategory ?? '').trim(),
    genderTarget: String(payload.genderTarget ?? 'unisex').trim(),
    price: Number(payload.price ?? 0),
    color: String(payload.color ?? '').trim(),
    colorFamily: String(payload.colorFamily ?? '').trim(),
    styleTags: Array.isArray(payload.styleTags) ? payload.styleTags : [],
    season: Array.isArray(payload.season) ? payload.season : [],
    occasion: Array.isArray(payload.occasion) ? payload.occasion : [],
    fitType: String(payload.fitType ?? '').trim(),
    fabricWeight: String(payload.fabricWeight ?? '').trim(),
    material: String(payload.material ?? '').trim(),
    sizes: Array.isArray(payload.sizes) ? payload.sizes : [],
    colors: Array.isArray(payload.colors) ? payload.colors : [],
    image: String(payload.image ?? '').trim(),
    images: Array.isArray(payload.images) ? payload.images : [],
    inventoryCount: Number.isFinite(Number(payload.inventoryCount)) ? Number(payload.inventoryCount) : 0,
    rating: Number.isFinite(Number(payload.rating)) ? Number(payload.rating) : 0,
    isActive: payload.isActive !== false
  };
}

function buildQuery({ category, includeInactive = false } = {}) {
  const query = {};

  if (category) {
    query.category = category;
  }

  if (!includeInactive) {
    query.isActive = true;
  }

  return query;
}

export function normalizeProduct(product) {
  return toPlainProduct(product);
}

export async function listProducts(filters = {}) {
  if (mongoose.connection.readyState === 1) {
    const products = await Product.find(buildQuery(filters)).sort({ category: 1, createdAt: -1 }).lean();
    return products.map(toPlainProduct);
  }

  return memoryProducts
    .filter((product) => (filters.includeInactive ? true : product.isActive))
    .filter((product) => (filters.category ? product.category === filters.category : true))
    .map(toPlainProduct);
}

export async function getProductBySourceId(sourceId) {
  if (!sourceId) {
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    const product = await Product.findOne({ sourceId: String(sourceId) }).lean();
    return toPlainProduct(product);
  }

  return toPlainProduct(memoryProducts.find((product) => product.sourceId === String(sourceId)) ?? null);
}

export async function createProduct(payload) {
  const storedProduct = toStoredProduct(payload);

  if (mongoose.connection.readyState === 1) {
    const created = await Product.create(storedProduct);
    return toPlainProduct(created.toObject());
  }

  memoryProducts.unshift(storedProduct);
  return toPlainProduct(storedProduct);
}

export async function updateProduct(sourceId, payload) {
  if (!sourceId) {
    return null;
  }

  const existing = await getProductBySourceId(sourceId);

  if (!existing) {
    return null;
  }

  const updates = toStoredProduct({ ...existing, ...payload, sourceId });

  if (mongoose.connection.readyState === 1) {
    const updated = await Product.findOneAndUpdate({ sourceId: String(sourceId) }, { $set: updates }, { new: true, runValidators: true }).lean();
    return toPlainProduct(updated);
  }

  const index = memoryProducts.findIndex((product) => product.sourceId === String(sourceId));

  if (index === -1) {
    return null;
  }

  memoryProducts[index] = { ...memoryProducts[index], ...updates };
  return toPlainProduct(memoryProducts[index]);
}

export async function deleteProduct(sourceId) {
  if (!sourceId) {
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    return Product.findOneAndDelete({ sourceId: String(sourceId) }).lean();
  }

  const index = memoryProducts.findIndex((product) => product.sourceId === String(sourceId));

  if (index === -1) {
    return null;
  }

  const [removed] = memoryProducts.splice(index, 1);
  return toPlainProduct(removed);
}

export async function seedDemoProducts() {
  const seedPayloads = DEMO_PRODUCTS.map((product) => ({
    ...product,
    sourceId: product.id,
    sku: product.sku ?? '',
    slug: product.slug ?? product.id,
    subCategory: product.subCategory ?? '',
    genderTarget: product.genderTarget ?? 'unisex',
    fabricWeight: product.fabricWeight ?? '',
    material: product.material ?? '',
    sizes: product.sizes ?? [],
    colors: product.colors ?? (product.color ? [product.color] : []),
    image: product.image ?? '',
    images: product.images ?? (product.image ? [product.image] : []),
    inventoryCount: product.inventoryCount ?? 12,
    rating: product.rating ?? 0,
    isActive: product.isActive ?? true
  }));

  if (mongoose.connection.readyState === 1) {
    const operations = seedPayloads.map((product) => ({
      updateOne: {
        filter: { sourceId: product.sourceId },
        update: { $setOnInsert: product },
        upsert: true
      }
    }));

    if (operations.length > 0) {
      await Product.bulkWrite(operations, { ordered: false });
    }

    return listProducts({ includeInactive: true });
  }

  if (memoryProducts.length === 0) {
    memoryProducts.push(...seedPayloads);
  }

  return listProducts({ includeInactive: true });
}
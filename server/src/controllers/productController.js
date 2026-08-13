import { createProduct, deleteProduct, getProductBySourceId, listProducts, seedDemoProducts, updateProduct } from '../services/productService.js';

function normalizeProductPayload(body = {}) {
  const payload = {};

  if (body.sourceId !== undefined || body.id !== undefined) payload.sourceId = body.sourceId ?? body.id;
  if (body.sku !== undefined) payload.sku = body.sku;
  if (body.slug !== undefined) payload.slug = body.slug;
  if (body.name !== undefined) payload.name = body.name;
  if (body.brand !== undefined) payload.brand = body.brand;
  if (body.category !== undefined) payload.category = body.category;
  if (body.subCategory !== undefined) payload.subCategory = body.subCategory;
  if (body.genderTarget !== undefined) payload.genderTarget = body.genderTarget;
  if (body.price !== undefined) payload.price = body.price;
  if (body.color !== undefined) payload.color = body.color;
  if (body.colorFamily !== undefined) payload.colorFamily = body.colorFamily;
  if (body.styleTags !== undefined) payload.styleTags = Array.isArray(body.styleTags) ? body.styleTags : [];
  if (body.season !== undefined) payload.season = Array.isArray(body.season) ? body.season : [];
  if (body.occasion !== undefined) payload.occasion = Array.isArray(body.occasion) ? body.occasion : [];
  if (body.fitType !== undefined) payload.fitType = body.fitType;
  if (body.fabricWeight !== undefined) payload.fabricWeight = body.fabricWeight;
  if (body.material !== undefined) payload.material = body.material;
  if (body.sizes !== undefined) payload.sizes = Array.isArray(body.sizes) ? body.sizes : [];
  if (body.colors !== undefined) payload.colors = Array.isArray(body.colors) ? body.colors : [];
  if (body.image !== undefined) payload.image = body.image;
  if (body.images !== undefined) payload.images = Array.isArray(body.images) ? body.images : [];
  if (body.inventoryCount !== undefined) payload.inventoryCount = body.inventoryCount;
  if (body.rating !== undefined) payload.rating = body.rating;
  if (body.isActive !== undefined) payload.isActive = body.isActive;

  return payload;
}

function validateProductPayload(payload, isUpdate = false) {
  if (!isUpdate) {
    if (!payload.name || !payload.brand || !payload.category || payload.price === undefined) {
      return { valid: false, message: 'name, brand, category, and price are required.' };
    }
  }

  if (payload.price !== undefined && Number(payload.price) < 0) {
    return { valid: false, message: 'price must be zero or greater.' };
  }

  if (payload.inventoryCount !== undefined && Number(payload.inventoryCount) < 0) {
    return { valid: false, message: 'inventoryCount must be zero or greater.' };
  }

  return { valid: true, message: 'ok' };
}

export async function listCatalog(req, res) {
  const includeInactive = req.query.includeInactive === 'true' && req.user?.role === 'admin';
  const products = await listProducts({ category: req.query.category, includeInactive });
  res.json(products);
}

export async function getCatalogItem(req, res) {
  const product = await getProductBySourceId(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found.' });
  }

  return res.json(product);
}

export async function createCatalogItem(req, res) {
  const payload = normalizeProductPayload(req.body);
  const validation = validateProductPayload(payload);

  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  const created = await createProduct(payload);
  return res.status(201).json(created);
}

export async function updateCatalogItem(req, res) {
  const payload = normalizeProductPayload(req.body);
  const validation = validateProductPayload(payload, true);

  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  const updated = await updateProduct(req.params.id, payload);

  if (!updated) {
    return res.status(404).json({ message: 'Product not found.' });
  }

  return res.json(updated);
}

export async function deleteCatalogItem(req, res) {
  const deleted = await deleteProduct(req.params.id);

  if (!deleted) {
    return res.status(404).json({ message: 'Product not found.' });
  }

  return res.status(204).send();
}

export async function seedCatalog(_req, res) {
  const products = await seedDemoProducts();
  return res.status(201).json({ seeded: products.length, products });
}
import { Router } from 'express';
import {
  createCatalogItem,
  deleteCatalogItem,
  getCatalogItem,
  listCatalog,
  seedCatalog,
  updateCatalogItem
} from '../controllers/productController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireProductAdmin } from '../middleware/adminMiddleware.js';

const router = Router();

router.get('/', listCatalog);
router.post('/seed', requireAuth, requireProductAdmin, seedCatalog);
router.post('/', requireAuth, requireProductAdmin, createCatalogItem);
router.get('/:id', getCatalogItem);
router.put('/:id', requireAuth, requireProductAdmin, updateCatalogItem);
router.delete('/:id', requireAuth, requireProductAdmin, deleteCatalogItem);

export default router;
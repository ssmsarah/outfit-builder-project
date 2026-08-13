import { Router } from 'express';
import {
  buyOutfit,
  getOutfitRules,
  getRecommendations,
  listOutfits,
  previewOutfit,
  replaceItem,
  saveOutfit
} from '../controllers/outfitBuilderController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/recommendations', getRecommendations);
router.get('/saved', requireAuth, listOutfits);
router.get('/rules', getOutfitRules);
router.post('/preview', previewOutfit);
router.post('/save', requireAuth, saveOutfit);
router.post('/buy-now', requireAuth, buyOutfit);
router.post('/:id/replace-item', replaceItem);

export default router;

import express from "express";

import { getStores, getStore } from "../controllers/storeController.js";

const router = express.Router();

router.get("/", getStores);
router.get("/:sellerId", getStore);

export default router;

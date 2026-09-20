import express from "express";

import {
  getDashboardStats,
  getSellers,
  approveSeller,
  rejectSeller,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/stats", getDashboardStats);

router.get("/sellers", getSellers);

router.patch("/sellers/:id/approve", approveSeller);

router.patch("/sellers/:id/reject", rejectSeller);

export default router;
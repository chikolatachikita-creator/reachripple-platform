import { Router } from "express";
import {
  getSettings,
  saveSetting,
  getPricingSettings,
  savePricingSettings,
} from "../controllers/settingController";
import auth from "../middleware/auth";
import admin from "../middleware/admin";

const router = Router();

// Platform settings = admin-only
router.get("/", auth, admin, getSettings);
router.post("/", auth, admin, saveSetting);

// Pricing/payment settings (subset)
router.get("/pricing", auth, admin, getPricingSettings);
router.post("/pricing", auth, admin, savePricingSettings);

export default router;
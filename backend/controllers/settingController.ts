import { Request, Response } from "express";
import Setting from "../models/Setting";
import logger from "../utils/logger";

// Pricing key prefixes for filtering
const PRICING_PREFIXES = ["pricing_", "payment_"];

// GET /settings – returns a flat { key: value } object
export const getSettings = async (req: Request, res: Response) => {
  try {
    const docs = await Setting.find().sort({ key: 1 });
    const flat: Record<string, unknown> = {};
    for (const doc of docs) {
      flat[doc.key] = doc.value;
    }
    return res.json(flat);
  } catch (err: any) {
    logger.error("getSettings error", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// POST /settings – accepts a flat { key: value, ... } object, upserts each pair
export const saveSetting = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
      return res.status(400).json({ message: "Settings object is required" });
    }

    const ops = Object.entries(body).map(([key, value]) =>
      Setting.findOneAndUpdate({ key }, { value }, { upsert: true, new: true })
    );
    await Promise.all(ops);

    // Return the updated flat object
    const docs = await Setting.find().sort({ key: 1 });
    const flat: Record<string, unknown> = {};
    for (const doc of docs) {
      flat[doc.key] = doc.value;
    }
    return res.json(flat);
  } catch (err: any) {
    logger.error("saveSetting error", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// GET /settings/pricing – returns only pricing/payment-related settings
export const getPricingSettings = async (req: Request, res: Response) => {
  try {
    const docs = await Setting.find({
      key: { $regex: `^(${PRICING_PREFIXES.join("|")})` },
    }).sort({ key: 1 });

    const flat: Record<string, unknown> = {};
    for (const doc of docs) {
      flat[doc.key] = doc.value;
    }
    return res.json(flat);
  } catch (err: any) {
    logger.error("getPricingSettings error", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// POST /settings/pricing – update only pricing/payment-related settings
export const savePricingSettings = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
      return res.status(400).json({ message: "Pricing settings object is required" });
    }

    // Validate that all keys have valid pricing prefixes
    const invalidKeys = Object.keys(body).filter(
      (key) => !PRICING_PREFIXES.some((prefix) => key.startsWith(prefix))
    );
    if (invalidKeys.length > 0) {
      return res.status(400).json({
        message: `Invalid pricing keys: ${invalidKeys.join(", ")}. Keys must start with: ${PRICING_PREFIXES.join(", ")}`,
      });
    }

    const ops = Object.entries(body).map(([key, value]) =>
      Setting.findOneAndUpdate({ key }, { value }, { upsert: true, new: true })
    );
    await Promise.all(ops);

    // Return updated pricing settings
    const docs = await Setting.find({
      key: { $regex: `^(${PRICING_PREFIXES.join("|")})` },
    }).sort({ key: 1 });

    const flat: Record<string, unknown> = {};
    for (const doc of docs) {
      flat[doc.key] = doc.value;
    }
    return res.json(flat);
  } catch (err: any) {
    logger.error("savePricingSettings error", err);
    return res.status(500).json({ error: "Server error" });
  }
};
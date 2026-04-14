import { Router, Request, Response } from 'express';
import Ad from '../models/Ad';
import BoostPurchase from '../models/BoostPurchase';
import { AdminConfig, AdminConfigModel } from '../models/AdminConfig';
import { AuditLog, AuditLogModel } from '../models/AuditLog';
import auth, { AuthRequest } from '../middleware/auth';
import { 
  PLACEMENT_TIERS, 
  BUMP_CONFIG, 
  ADDON_CONFIG, 
  DURATION_FACTORS,
  DEFAULT_DEMAND_MULTIPLIERS,
  MONETIZED_CATEGORIES,
} from '../constants/boostConfig';
import { logInfo, logWarn, logError } from '../utils/logger';

const router = Router();

// ============================================
// PRICING CALCULATION
// ============================================

interface PriceCalculation {
  basePriceGBP: number;
  demandMultiplier: number;
  durationFactor: number;
  finalPriceGBP: number;
  formattedPrice: string;
}

async function calculatePrice(
  boostType: string,
  durationDays: number,
  location?: string
): Promise<PriceCalculation> {
  // Get config for location
  const config = await AdminConfig.getEffectiveConfig(location);
  
  // Get base price
  let basePriceGBP = 0;
  
  if (boostType in PLACEMENT_TIERS) {
    basePriceGBP = PLACEMENT_TIERS[boostType as keyof typeof PLACEMENT_TIERS].basePriceGBP;
  } else if (boostType in ADDON_CONFIG) {
    basePriceGBP = ADDON_CONFIG[boostType as keyof typeof ADDON_CONFIG].basePriceGBP;
  }
  
  // Check for custom pricing override
  if (config.customPricing && config.customPricing[boostType as keyof typeof config.customPricing]) {
    basePriceGBP = config.customPricing[boostType as keyof typeof config.customPricing]!;
  }
  
  // Get demand multiplier
  const demandMultiplier = config.demandMultiplier || 
    DEFAULT_DEMAND_MULTIPLIERS[location?.toLowerCase() || 'default'] || 1.0;
  
  // Get duration factor
  const durationFactor = DURATION_FACTORS[durationDays] || 1.0;
  
  // Calculate final price
  const finalPriceGBP = Math.round(basePriceGBP * demandMultiplier * durationFactor * 100) / 100;
  
  return {
    basePriceGBP,
    demandMultiplier,
    durationFactor,
    finalPriceGBP,
    formattedPrice: `£${finalPriceGBP.toFixed(2)}`,
  };
}

// ============================================
// GET PRICING OPTIONS
// ============================================

/**
 * GET /api/boost/pricing
 * Get available pricing options for a location
 */
router.get('/pricing', async (req: Request, res: Response) => {
  try {
    const { location, adId } = req.query;
    
    const config = await AdminConfig.getEffectiveConfig(location as string);
    const durations = config.allowedDurations || [1, 3, 7, 14, 30];
    
    // Build pricing matrix
    const pricing: Record<string, any> = {};
    
    for (const tier of ['FEATURED', 'PRIORITY_PLUS', 'PRIORITY', 'STANDARD'] as const) {
      pricing[tier] = {
        name: PLACEMENT_TIERS[tier].displayName,
        description: PLACEMENT_TIERS[tier].description,
        durations: await Promise.all(
          durations.map(async (days: number) => ({
            days,
            ...(await calculatePrice(tier, days, location as string)),
          }))
        ),
      };
    }
    
    // Add add-ons
    pricing.HIGHLIGHT = {
      name: ADDON_CONFIG.HIGHLIGHT.displayName,
      description: ADDON_CONFIG.HIGHLIGHT.description,
      durations: await Promise.all(
        [7].map(async (days: number) => ({
          days,
          ...(await calculatePrice('HIGHLIGHT', days, location as string)),
        }))
      ),
    };
    
    pricing.EXTERNAL_LINK = {
      name: ADDON_CONFIG.EXTERNAL_LINK.displayName,
      description: ADDON_CONFIG.EXTERNAL_LINK.description,
      durations: await Promise.all(
        [7].map(async (days: number) => ({
          days,
          ...(await calculatePrice('EXTERNAL_LINK', days, location as string)),
        }))
      ),
    };
    
    // Check capacity for location
    let capacityInfo = null;
    if (location) {
      const featuredCapacity = await AdminConfig.checkCapacity('FEATURED', location as string, Ad);
      const priorityPlusCapacity = await AdminConfig.checkCapacity('PRIORITY_PLUS', location as string, Ad);
      
      capacityInfo = {
        FEATURED: featuredCapacity,
        PRIORITY_PLUS: priorityPlusCapacity,
      };
    }
    
    res.json({
      success: true,
      data: {
        pricing,
        capacity: capacityInfo,
        config: {
          enableTumbleUp: config.enableTumbleUp,
          tumbleUpCooldownMinutes: config.tumbleUpCooldownMinutes,
        },
      },
    });
  } catch (error) {
    logError('Get pricing failed', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pricing',
    });
  }
});

// ============================================
// PURCHASE BOOST
// ============================================

/**
 * POST /api/boost/purchase
 * Purchase a boost/tier for an ad
 */
router.post('/purchase', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { 
      adId, 
      boostType, 
      durationDays = 7,
      tapUpIntervalHours,
      paymentReference,
    } = req.body;
    
    // Validate
    if (!adId || !boostType) {
      return res.status(400).json({
        success: false,
        error: 'adId and boostType are required',
      });
    }
    
    // Verify ad ownership
    const ad = await Ad.findOne({ _id: adId, userId });
    if (!ad) {
      return res.status(404).json({
        success: false,
        error: 'Ad not found or not owned by you',
      });
    }
    
    // Check ad status
    if (ad.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Only approved ads can be boosted',
      });
    }

    // Idempotency: prevent duplicate purchases with same paymentReference
    if (paymentReference) {
      const existing = await BoostPurchase.findOne({ paymentReference });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'This payment has already been processed',
          purchaseId: existing._id,
        });
      }
    }
    
    // Calculate price
    const location = ad.location || ad.locationSlug;
    const priceInfo = await calculatePrice(boostType, durationDays, location);
    
    // Check capacity for tier boosts
    if (['FEATURED', 'PRIORITY_PLUS'].includes(boostType)) {
      const featuredCapacity = await AdminConfig.checkCapacity('FEATURED', location || '', Ad);
      const priorityPlusCapacity = await AdminConfig.checkCapacity('PRIORITY_PLUS', location || '', Ad);
      
      if (boostType === 'FEATURED' && !featuredCapacity.hasCapacity) {
        return res.status(409).json({
          success: false,
          code: 'FEATURED_SOLD_OUT',
          error: `Featured is currently full in ${location || 'this location'}.`,
          featured: {
            cap: featuredCapacity.cap,
            active: featuredCapacity.currentCount,
            remaining: featuredCapacity.remaining,
          },
          suggested: {
            tier: 'PRIORITY_PLUS',
            available: priorityPlusCapacity.hasCapacity,
            displayName: 'Priority Plus',
          },
        });
      }
      
      if (boostType === 'PRIORITY_PLUS' && !priorityPlusCapacity.hasCapacity) {
        return res.status(409).json({
          success: false,
          code: 'PRIORITY_PLUS_SOLD_OUT',
          error: `Priority Plus is currently full in ${location || 'this location'}.`,
          suggested: {
            tier: 'PRIORITY',
            available: true,
            displayName: 'Priority',
          },
        });
      }
    }
    
    // Calculate expiry
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    
    // Create purchase record with direct GBP pricing
    const purchase = await BoostPurchase.create({
      userId,
      adId: ad._id,
      boostType,
      status: 'active',
      purchasedAt: now,
      activatedAt: now,
      expiresAt,
      durationDays,
      tapUpIntervalHours: boostType === 'TAP_UP' ? (tapUpIntervalHours || 12) : undefined,
      basePriceGBP: priceInfo.basePriceGBP,
      demandMultiplier: priceInfo.demandMultiplier,
      durationFactor: priceInfo.durationFactor,
      finalPriceGBP: priceInfo.finalPriceGBP,
      paymentStatus: 'completed',
      paymentReference,
      location,
      outcode: ad.outcode,
    });
    
    // Apply boost to ad
    const updateData: any = {
      lastPulsedAt: now, // Immediate bump
    };
    
    if (['FEATURED', 'PRIORITY_PLUS', 'PRIORITY', 'STANDARD'].includes(boostType)) {
      updateData.tier = boostType;
      updateData.tierUntil = expiresAt;
    } else if (boostType === 'HIGHLIGHT') {
      updateData.hasHighlight = true;
      updateData.highlightUntil = expiresAt;
    } else if (boostType === 'EXTERNAL_LINK') {
      updateData.websiteLinkUntil = expiresAt;
    }
    
    await Ad.findByIdAndUpdate(ad._id, updateData);
    
    // Audit log
    await AuditLog.log('TIER_UPGRADE', {
      userId: ad.userId,
      adId: ad._id,
      previousValue: { tier: ad.tier },
      newValue: { tier: boostType, expiresAt },
      metadata: {
        purchaseId: purchase._id,
        price: priceInfo.finalPriceGBP,
        durationDays,
      },
    });
    
    logInfo('Boost purchased', {
      userId,
      adId: ad._id.toString(),
      boostType,
      durationDays,
      price: priceInfo.finalPriceGBP,
    });
    
    res.json({
      success: true,
      data: {
        purchase,
        ad: await Ad.findById(ad._id),
      },
    });
  } catch (error) {
    logError('Purchase boost failed', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to purchase boost',
    });
  }
});

// ============================================
// GET USER'S ACTIVE BOOSTS
// ============================================

/**
 * GET /api/boost/my-boosts
 * Get current user's active boosts
 */
router.get('/my-boosts', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    
    const boosts = await BoostPurchase.find({
      userId,
      status: 'active',
      expiresAt: { $gt: new Date() },
    })
      .populate('adId', 'title images tier status')
      .sort({ expiresAt: 1 });
    
    res.json({
      success: true,
      data: boosts,
    });
  } catch (error) {
    logError('Get my boosts failed', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to get boosts',
    });
  }
});

// ============================================
// GET BOOST STATUS FOR AD
// ============================================

/**
 * GET /api/boost/status/:adId
 * Get boost status for a specific ad
 */
router.get('/status/:adId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { adId } = req.params;
    
    // Verify ownership
    const ad = await Ad.findOne({ _id: adId, userId });
    if (!ad) {
      return res.status(404).json({
        success: false,
        error: 'Ad not found',
      });
    }
    
    // Get active boosts
    const activeBoosts = await BoostPurchase.find({
      adId: ad._id,
      status: 'active',
      expiresAt: { $gt: new Date() },
    });
    
    // Calculate bump eligibility
    const now = new Date();
    const canTumbleUp = 
      ['FEATURED', 'PRIORITY_PLUS'].includes(ad.tier || 'STANDARD') &&
      (!ad.pulseCooldownUntil || now >= new Date(ad.pulseCooldownUntil));
    
    const tapUpActive = false;
    
    res.json({
      success: true,
      data: {
        ad: {
          _id: ad._id,
          title: ad.title,
          tier: ad.tier,
          tierUntil: ad.tierUntil,
          lastPulsedAt: ad.lastPulsedAt,
          pulseCooldownUntil: ad.pulseCooldownUntil,
          hasTapUp: tapUpActive,
          tapUpUntil: ad.tapUpUntil,
          tapUpIntervalHours: ad.tapUpIntervalHours,
          nextTapUpAt: ad.nextTapUpAt,
          hasNewLabel: ad.hasNewLabel,
          newLabelUntil: ad.newLabelUntil,
        },
        activeBoosts,
        canTumbleUp,
        tumbleUpCooldownMinutes: 20, // From config
      },
    });
  } catch (error) {
    logError('Get boost status failed', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to get boost status',
    });
  }
});

// ============================================
// PURCHASE HISTORY
// ============================================

/**
 * GET /api/boost/history
 * Get user's purchase history
 */
router.get('/history', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { page = '1', limit = '20' } = req.query;
    
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * pageSize;
    
    const [purchases, total] = await Promise.all([
      BoostPurchase.find({ userId })
        .populate('adId', 'title images')
        .sort({ purchasedAt: -1 })
        .skip(skip)
        .limit(pageSize),
      BoostPurchase.countDocuments({ userId }),
    ]);
    
    res.json({
      success: true,
      data: {
        purchases,
        pagination: {
          page: pageNum,
          limit: pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    logError('Get purchase history failed', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to get purchase history',
    });
  }
});

export default router;

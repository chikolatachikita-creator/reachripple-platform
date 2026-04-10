import { Router, Request, Response } from 'express';
import DailyRevenue from '../../models/DailyRevenue';
import BoostPurchase from '../../models/BoostPurchase';
import Ad from '../../models/Ad';
import { AuditLog } from '../../models/AuditLog';
import { generateAbuseReport } from '../../services/abusePreventionService';
import { logInfo, logError } from '../../utils/logger';
import { escapeRegex } from '../../utils/sanitize';

const router = Router();

// ============================================
// REVENUE OVERVIEW
// ============================================

/**
 * GET /api/admin/revenue/overview
 * Get revenue overview for dashboard
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }
    
    // Get aggregate stats from BoostPurchase
    const [
      totalStats,
      productBreakdown,
      recentPurchases,
    ] = await Promise.all([
      // Total revenue
      BoostPurchase.aggregate([
        {
          $match: {
            purchaseDate: { $gte: startDate, $lte: endDate },
            status: 'active',
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$price' },
            totalTransactions: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            uniqueAds: { $addToSet: '$adId' },
          },
        },
      ]),
      
      // Breakdown by product
      BoostPurchase.aggregate([
        {
          $match: {
            purchaseDate: { $gte: startDate, $lte: endDate },
            status: 'active',
          },
        },
        {
          $group: {
            _id: '$boostType',
            revenue: { $sum: '$price' },
            count: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
      ]),
      
      // Recent purchases
      BoostPurchase.find({ status: 'active' })
        .sort({ purchaseDate: -1 })
        .limit(10)
        .populate('userId', 'name email')
        .populate('adId', 'title'),
    ]);
    
    // Get previous period for comparison
    const prevEndDate = new Date(startDate);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - daysDiff);
    
    const prevStats = await BoostPurchase.aggregate([
      {
        $match: {
          purchaseDate: { $gte: prevStartDate, $lt: prevEndDate },
          status: 'active',
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$price' },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);
    
    const current = totalStats[0] || { totalRevenue: 0, totalTransactions: 0, uniqueUsers: [], uniqueAds: [] };
    const previous = prevStats[0] || { totalRevenue: 0, totalTransactions: 0 };
    
    res.json({
      period,
      current: {
        totalRevenue: current.totalRevenue,
        totalTransactions: current.totalTransactions,
        uniqueUsers: current.uniqueUsers?.length || 0,
        uniqueAds: current.uniqueAds?.length || 0,
      },
      previous: {
        totalRevenue: previous.totalRevenue,
        totalTransactions: previous.totalTransactions,
      },
      percentChange: {
        revenue: previous.totalRevenue > 0 
          ? ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue * 100).toFixed(1)
          : 0,
        transactions: previous.totalTransactions > 0
          ? ((current.totalTransactions - previous.totalTransactions) / previous.totalTransactions * 100).toFixed(1)
          : 0,
      },
      productBreakdown: productBreakdown.map(p => ({
        product: p._id,
        revenue: p.revenue,
        count: p.count,
        percentage: current.totalRevenue > 0 ? (p.revenue / current.totalRevenue * 100).toFixed(1) : 0,
      })),
      recentPurchases: recentPurchases.map(p => ({
        id: p._id,
        product: p.boostType,
        price: p.finalPriceGBP,
        date: p.purchasedAt,
        user: (p.userId as any)?.name || 'Unknown',
        adTitle: (p.adId as any)?.title || 'Unknown',
      })),
    });
  } catch (err) {
    logError('Revenue overview error', err as Error);
    res.status(500).json({ error: 'Failed to fetch revenue overview' });
  }
});

// ============================================
// REVENUE BY LOCATION
// ============================================

/**
 * GET /api/admin/revenue/by-location
 * Get revenue breakdown by location (heatmap data)
 */
router.get('/by-location', async (req: Request, res: Response) => {
  try {
    const { period = '30d', limit = 50 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period as string) || 30);
    
    const locationRevenue = await BoostPurchase.aggregate([
      {
        $match: {
          purchaseDate: { $gte: startDate, $lte: endDate },
          status: 'active',
        },
      },
      {
        $lookup: {
          from: 'ads',
          localField: 'adId',
          foreignField: '_id',
          as: 'ad',
        },
      },
      { $unwind: '$ad' },
      {
        $group: {
          _id: '$ad.location',
          revenue: { $sum: '$price' },
          transactions: { $sum: 1 },
          uniqueAds: { $addToSet: '$adId' },
        },
      },
      {
        $project: {
          location: '$_id',
          revenue: 1,
          transactions: 1,
          uniqueAds: { $size: '$uniqueAds' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: parseInt(limit as string) || 50 },
    ]);
    
    res.json({
      period,
      locations: locationRevenue,
    });
  } catch (err) {
    logError('Revenue by location error', err as Error);
    res.status(500).json({ error: 'Failed to fetch location revenue' });
  }
});

// ============================================
// REVENUE TRENDS
// ============================================

/**
 * GET /api/admin/revenue/trends
 * Get revenue trends over time (chart data)
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const { period = '30d', groupBy = 'day' } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (parseInt(period as string) || 30));
    
    const dateFormat = groupBy === 'week' ? '%Y-W%V'
      : groupBy === 'month' ? '%Y-%m'
      : '%Y-%m-%d';
    
    const trends = await BoostPurchase.aggregate([
      {
        $match: {
          purchaseDate: { $gte: startDate, $lte: endDate },
          status: 'active',
        },
      },
      {
        $group: {
          _id: {
            period: { $dateToString: { format: dateFormat, date: '$purchaseDate' } },
            product: '$boostType',
          },
          revenue: { $sum: '$price' },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.period',
          totalRevenue: { $sum: '$revenue' },
          totalCount: { $sum: '$count' },
          products: {
            $push: {
              product: '$_id.product',
              revenue: '$revenue',
              count: '$count',
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    res.json({
      period,
      groupBy,
      trends: trends.map(t => ({
        period: t._id,
        totalRevenue: t.totalRevenue,
        totalCount: t.totalCount,
        products: t.products,
      })),
    });
  } catch (err) {
    logError('Revenue trends error', err as Error);
    res.status(500).json({ error: 'Failed to fetch revenue trends' });
  }
});

// ============================================
// INVENTORY STATUS
// ============================================

/**
 * GET /api/admin/revenue/inventory
 * Get current inventory status by location
 */
router.get('/inventory', async (req: Request, res: Response) => {
  try {
    const { location } = req.query;
    
    const match: any = {
      status: 'approved',
      isDeleted: { $ne: true },
      tier: { $in: ['FEATURED', 'PRIORITY_PLUS'] },
    };
    
    if (location) {
      match.location = { $regex: new RegExp(escapeRegex(location as string), 'i') };
    }
    
    const inventory = await Ad.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            location: '$location',
            tier: '$tier',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.location',
          tiers: {
            $push: {
              tier: '$_id.tier',
              count: '$count',
            },
          },
          total: { $sum: '$count' },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 50 },
    ]);
    
    // Add cap info (from config)
    const TIER_CAPS = {
      FEATURED: 10,
      PRIORITY_PLUS: 50,
    };
    
    res.json({
      caps: TIER_CAPS,
      locations: inventory.map(loc => ({
        location: loc._id,
        featured: loc.tiers.find((t: any) => t.tier === 'FEATURED')?.count || 0,
        featuredCap: TIER_CAPS.FEATURED,
        featuredFillRate: ((loc.tiers.find((t: any) => t.tier === 'FEATURED')?.count || 0) / TIER_CAPS.FEATURED * 100).toFixed(1),
        priorityPlus: loc.tiers.find((t: any) => t.tier === 'PRIORITY_PLUS')?.count || 0,
        priorityPlusCap: TIER_CAPS.PRIORITY_PLUS,
        priorityPlusFillRate: ((loc.tiers.find((t: any) => t.tier === 'PRIORITY_PLUS')?.count || 0) / TIER_CAPS.PRIORITY_PLUS * 100).toFixed(1),
        total: loc.total,
      })),
    });
  } catch (err) {
    logError('Inventory status error', err as Error);
    res.status(500).json({ error: 'Failed to fetch inventory status' });
  }
});

// ============================================
// ABUSE METRICS
// ============================================

/**
 * GET /api/admin/revenue/abuse
 * Get abuse metrics and suspicious activity
 */
router.get('/abuse', async (req: Request, res: Response) => {
  try {
    const { hours = 24 } = req.query;
    
    const abuseReport = await generateAbuseReport(parseInt(hours as string) || 24);
    
    res.json(abuseReport);
  } catch (err) {
    logError('Abuse metrics error', err as Error);
    res.status(500).json({ error: 'Failed to fetch abuse metrics' });
  }
});

// ============================================
// EXPIRING TIERS
// ============================================

/**
 * GET /api/admin/revenue/expiring
 * Get tiers expiring soon (for proactive outreach)
 */
router.get('/expiring', async (req: Request, res: Response) => {
  try {
    const { hours = 48 } = req.query;
    
    const now = new Date();
    const expiryWindow = new Date(now.getTime() + parseInt(hours as string) * 60 * 60 * 1000);
    
    const expiringAds = await Ad.find({
      status: 'approved',
      isDeleted: { $ne: true },
      tier: { $in: ['FEATURED', 'PRIORITY_PLUS', 'PRIORITY'] },
      tierUntil: { $gte: now, $lte: expiryWindow },
    })
      .populate('userId', 'name email')
      .sort({ tierUntil: 1 })
      .limit(100);
    
    res.json({
      withinHours: hours,
      count: expiringAds.length,
      ads: expiringAds.map(ad => ({
        adId: ad._id,
        title: ad.title,
        tier: ad.tier,
        tierUntil: ad.tierUntil,
        location: ad.location,
        user: (ad.userId as any)?.name || 'Unknown',
        userEmail: (ad.userId as any)?.email || '',
        hoursRemaining: Math.ceil(((ad.tierUntil as Date).getTime() - now.getTime()) / (1000 * 60 * 60)),
      })),
    });
  } catch (err) {
    logError('Expiring tiers error', err as Error);
    res.status(500).json({ error: 'Failed to fetch expiring tiers' });
  }
});

export default router;

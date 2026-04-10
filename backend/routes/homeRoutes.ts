import { Router, Request, Response } from 'express';
import { buildHomeLists, HomeQueryParams } from '../services/rankingService';
import { setCache, getCache } from '../services/cacheService';
import { logInfo, logError } from '../utils/logger';

const router = Router();

/**
 * Homepage API Route
 * Returns tiered ad listings for homepage display
 * 
 * GET /api/home
 * Query params:
 *   - location: Filter by location (e.g., "london")
 *   - outcode: Filter by UK postcode outcode (e.g., "N1")
 *   - category: Filter by category
 *   - page: Page number for standard listings (default: 1)
 *   - limit: Items per page for standard listings (default: 50)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      location,
      outcode,
      category,
      page = '1',
      limit = '50',
    } = req.query;
    
    const params: HomeQueryParams = {
      location: location as string,
      outcode: outcode as string,
      category: category as string,
      page: Math.max(1, parseInt(page as string, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50)),
    };
    
    // Cache key based on params
    const cacheKey = `home:${params.location || 'all'}:${params.outcode || 'all'}:${params.category || 'all'}:${params.page}:${params.limit}`;
    
    // Try cache first (60 second TTL for homepage)
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({
        ...cached,
        fromCache: true,
      });
    }
    
    // Build fresh lists
    const result = await buildHomeLists(params);
    
    // Cache for 60 seconds
    await setCache(cacheKey, result, 60);
    
    res.json({
      success: true,
      data: result,
      fromCache: false,
    });
  } catch (error) {
    logError('Homepage query failed', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to load homepage listings',
    });
  }
});

/**
 * GET /api/home/vip
 * Returns only VIP (SPOTLIGHT) tier ads
 * Useful for lazy-loading VIP carousel
 */
router.get('/vip', async (req: Request, res: Response) => {
  try {
    const { location, outcode, maxItems = '10' } = req.query;
    
    const result = await buildHomeLists({
      location: location as string,
      outcode: outcode as string,
    });
    
    const limit = Math.min(20, Math.max(1, parseInt(maxItems as string, 10) || 10));
    
    res.json({
      success: true,
      data: {
        vip: result.vip.slice(0, limit),
        totalVip: result.vip.length,
        seed: result.seed,
      },
    });
  } catch (error) {
    logError('VIP query failed', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to load VIP listings',
    });
  }
});

/**
 * GET /api/home/featured
 * Returns only Featured (PRIME) tier ads
 * Useful for lazy-loading Featured section
 */
router.get('/featured', async (req: Request, res: Response) => {
  try {
    const { location, outcode, page = '1', limit = '20' } = req.query;
    
    const result = await buildHomeLists({
      location: location as string,
      outcode: outcode as string,
    });
    
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const startIndex = (pageNum - 1) * pageSize;
    
    res.json({
      success: true,
      data: {
        featured: result.featured.slice(startIndex, startIndex + pageSize),
        totalFeatured: result.featured.length,
        page: pageNum,
        totalPages: Math.ceil(result.featured.length / pageSize),
        seed: result.seed,
      },
    });
  } catch (error) {
    logError('Featured query failed', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to load featured listings',
    });
  }
});

/**
 * GET /api/home/feed
 * Returns standard feed (STANDARD + PRIORITY tier ads)
 * Main infinite-scroll feed
 */
router.get('/feed', async (req: Request, res: Response) => {
  try {
    const { location, outcode, page = '1', limit = '30', excludeVip = 'true' } = req.query;
    
    const result = await buildHomeLists({
      location: location as string,
      outcode: outcode as string,
      page: Math.max(1, parseInt(page as string, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit as string, 10) || 30)),
    });
    
    res.json({
      success: true,
      data: {
        ads: result.standard,
        totalAds: result.totalCount,
        page: parseInt(page as string, 10) || 1,
        hasMore: result.standard.length === (parseInt(limit as string, 10) || 30),
        seed: result.seed,
      },
    });
  } catch (error) {
    logError('Feed query failed', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to load feed',
    });
  }
});

/**
 * GET /api/home/stats
 * Returns counts for each tier (for admin/debugging)
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { location } = req.query;
    
    const result = await buildHomeLists({
      location: location as string,
    });
    
    res.json({
      success: true,
      data: {
        vipCount: result.vip.length,
        featuredCount: result.featured.length,
        standardCount: result.standard.length,
        totalCount: result.totalCount,
        generatedAt: result.generatedAt,
        seed: result.seed,
      },
    });
  } catch (error) {
    logError('Stats query failed', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to load stats',
    });
  }
});

export default router;

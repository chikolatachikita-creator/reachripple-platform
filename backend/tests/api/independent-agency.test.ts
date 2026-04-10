import request from 'supertest';
import createTestApp from '../testApp';
import User from '../../models/User';
import Ad from '../../models/Ad';
import bcrypt from 'bcryptjs';
import { POSTING_LIMITS } from '../../constants/boostConfig';
import { checkAdCreationAllowed } from '../../services/abusePreventionService';
import { Types } from 'mongoose';

const app = createTestApp();

describe('Independent vs Agency Features', () => {
  let independentToken: string;
  let independentUserId: string;
  let agencyToken: string;
  let agencyUserId: string;

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('SecurePass123!', 12);

    // Independent user (default)
    const indUser = await User.create({
      name: 'Indie User',
      email: 'indie@example.com',
      password: hashedPassword,
      role: 'user',
      status: 'active',
      accountType: 'independent',
      postingPlan: 'free',
    });
    independentUserId = indUser._id.toString();

    const indLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'indie@example.com', password: 'SecurePass123!' });
    independentToken = indLogin.body.accessToken;

    // Agency user
    const agUser = await User.create({
      name: 'Agency User',
      email: 'agency@example.com',
      password: hashedPassword,
      role: 'user',
      status: 'active',
      accountType: 'agency',
      postingPlan: 'basic',
    });
    agencyUserId = agUser._id.toString();

    const agLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'agency@example.com', password: 'SecurePass123!' });
    agencyToken = agLogin.body.accessToken;
  });

  // =============================================
  // POSTING LIMITS CONFIG
  // =============================================
  describe('Posting Limits Config', () => {
    it('should have defined limits for all account types and plans', () => {
      expect(POSTING_LIMITS.independent.free.maxActiveAds).toBe(1);
      expect(POSTING_LIMITS.independent.basic.maxActiveAds).toBe(3);
      expect(POSTING_LIMITS.independent.premium.maxActiveAds).toBe(5);
      expect(POSTING_LIMITS.agency.free.maxActiveAds).toBe(10);
      expect(POSTING_LIMITS.agency.basic.maxActiveAds).toBe(50);
      expect(POSTING_LIMITS.agency.premium.maxActiveAds).toBe(150);
    });
  });

  // =============================================
  // checkAdCreationAllowed (unit tests)
  // =============================================
  describe('checkAdCreationAllowed', () => {
    it('should allow independent free user to create 1 ad', async () => {
      const result = await checkAdCreationAllowed(new Types.ObjectId(independentUserId));
      expect(result.allowed).toBe(true);
      expect(result.maxAllowed).toBe(1);
      expect(result.currentCount).toBe(0);
    });

    it('should deny independent free user after 1 ad', async () => {
      await Ad.create({
        title: 'Ad 1',
        description: 'Test',
        category: 'escorts',
        location: 'London',
        price: 100,
        userId: independentUserId,
        status: 'pending',
      });

      const result = await checkAdCreationAllowed(new Types.ObjectId(independentUserId));
      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBe(1);
      expect(result.maxAllowed).toBe(1);
    });

    it('should allow agency basic user to create up to 50 ads', async () => {
      const result = await checkAdCreationAllowed(new Types.ObjectId(agencyUserId));
      expect(result.allowed).toBe(true);
      expect(result.maxAllowed).toBe(50);
    });

    it('should not count rejected or deleted ads', async () => {
      await Ad.create({
        title: 'Rejected',
        description: 'Test',
        category: 'escorts',
        location: 'London',
        price: 100,
        userId: independentUserId,
        status: 'rejected',
      });

      const result = await checkAdCreationAllowed(new Types.ObjectId(independentUserId));
      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0);
    });
  });

  // =============================================
  // POSTING LIMITS ENDPOINT
  // =============================================
  describe('GET /api/ads/posting-limits', () => {
    it('should return posting limits for authenticated independent user', async () => {
      const res = await request(app)
        .get('/api/ads/posting-limits')
        .set('Authorization', `Bearer ${independentToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('canCreate', true);
      expect(res.body).toHaveProperty('currentCount', 0);
      expect(res.body).toHaveProperty('maxAllowed', 1);
    });

    it('should return higher limits for agency user', async () => {
      const res = await request(app)
        .get('/api/ads/posting-limits')
        .set('Authorization', `Bearer ${agencyToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('canCreate', true);
      expect(res.body).toHaveProperty('maxAllowed', 50);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app)
        .get('/api/ads/posting-limits')
        .expect(401);
    });
  });

  // =============================================
  // AD CREATION WITH LIMITS
  // =============================================
  describe('POST /api/ads (posting limit enforcement)', () => {
    it('should enforce posting limit for independent free user', async () => {
      // Create first ad (should succeed)
      await Ad.create({
        title: 'Existing Ad',
        description: 'Already exists',
        category: 'escorts',
        location: 'London',
        price: 100,
        userId: independentUserId,
        status: 'approved',
      });

      // Try to create a second ad (should fail with posting limit)
      const res = await request(app)
        .post('/api/ads')
        .set('Authorization', `Bearer ${independentToken}`)
        .field('title', 'Second Ad')
        .field('description', 'Should fail')
        .field('category', 'escorts')
        .field('location', 'London')
        .field('price', '100')
        .expect(403);

      expect(res.body.error).toContain('Maximum');
      expect(res.body).toHaveProperty('maxAllowed', 1);
    });
  });

  // =============================================
  // PUBLISHER ENDPOINT
  // =============================================
  describe('GET /api/ads/publisher/:userId', () => {
    it('should return published ads for a user', async () => {
      await Ad.create({
        title: 'Published Ad',
        description: 'Published',
        category: 'escorts',
        location: 'London',
        price: 100,
        userId: agencyUserId,
        status: 'approved',
      });

      const res = await request(app)
        .get(`/api/ads/publisher/${agencyUserId}`)
        .expect(200);

      expect(res.body).toHaveProperty('ads');
      expect(res.body.ads.length).toBe(1);
      expect(res.body).toHaveProperty('total', 1);
    });

    it('should not return non-approved ads', async () => {
      await Ad.create({
        title: 'Pending Ad',
        description: 'Not approved',
        category: 'escorts',
        location: 'London',
        price: 100,
        userId: agencyUserId,
        status: 'pending',
      });

      const res = await request(app)
        .get(`/api/ads/publisher/${agencyUserId}`)
        .expect(200);

      expect(res.body.ads.length).toBe(0);
    });

    it('should reject invalid userId', async () => {
      await request(app)
        .get('/api/ads/publisher/invalid-id')
        .expect(400);
    });
  });

  // =============================================
  // USER MODEL: Account Type Fields
  // =============================================
  describe('User Model Fields', () => {
    it('should default to independent account type', async () => {
      const hashedPassword = await bcrypt.hash('TestPass123!', 12);
      const user = await User.create({
        name: 'New User',
        email: 'new@example.com',
        password: hashedPassword,
      });
      expect(user.accountType).toBe('independent');
      expect(user.postingPlan).toBe('free');
      expect(user.idVerificationStatus).toBe('unverified');
    });

    it('should accept agency account type with details', async () => {
      const hashedPassword = await bcrypt.hash('TestPass123!', 12);
      const user = await User.create({
        name: 'Agency Ltd',
        email: 'agency-test@example.com',
        password: hashedPassword,
        accountType: 'agency',
        postingPlan: 'premium',
        agencyDetails: {
          companyName: 'Test Agency Ltd',
          companyNumber: '12345678',
          vatNumber: 'GB123456789',
        },
      });
      expect(user.accountType).toBe('agency');
      expect(user.postingPlan).toBe('premium');
      expect(user.agencyDetails?.companyName).toBe('Test Agency Ltd');
    });
  });

  // =============================================
  // AD MODEL: Profile Type & Roaming
  // =============================================
  describe('Ad Model Fields', () => {
    it('should default profileFields.type to Independent', async () => {
      const ad = await Ad.create({
        title: 'Test Ad',
        description: 'Test',
        category: 'escorts',
        location: 'London',
        price: 100,
        userId: independentUserId,
      });
      expect(ad.profileFields?.type).toBe('Independent');
    });

    it('should support roamingLocations array', async () => {
      const ad = await Ad.create({
        title: 'Roaming Ad',
        description: 'Test',
        category: 'escorts',
        location: 'London',
        price: 100,
        userId: agencyUserId,
        roamingLocations: [
          { outcode: 'SW1', district: 'Westminster', until: new Date(Date.now() + 7 * 86400000) },
          { outcode: 'EC1', district: 'City', until: new Date(Date.now() + 7 * 86400000) },
        ],
      });
      expect(ad.roamingLocations?.length).toBe(2);
      expect(ad.roamingLocations?.[0].outcode).toBe('SW1');
    });
  });
});

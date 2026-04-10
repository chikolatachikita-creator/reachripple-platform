import request from 'supertest';
import createTestApp from '../testApp';
import User from '../../models/User';
import Ad from '../../models/Ad';
import bcrypt from 'bcryptjs';

const app = createTestApp();

describe('Ads API', () => {
  let accessToken: string;
  let userId: string;

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('SecurePass123!', 12);
    
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'user',
      status: 'active',
      idVerificationStatus: 'verified',
    });
    userId = user._id.toString();

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });

    accessToken = loginResponse.body.accessToken;
  });

  describe('GET /api/ads', () => {
    beforeEach(async () => {
      await Ad.create([
        {
          title: 'Test Ad 1',
          description: 'Description 1',
          category: 'Category A',
          location: 'London',
          price: 100,
          userId: userId,
          status: 'approved',
        },
        {
          title: 'Test Ad 2',
          description: 'Description 2',
          category: 'Category B',
          location: 'Manchester',
          price: 200,
          userId: userId,
          status: 'approved',
        },
      ]);
    });

    it('should return list of ads', async () => {
      const response = await request(app)
        .get('/api/ads')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('ads');
      expect(Array.isArray(response.body.ads)).toBe(true);
    });

    it('should filter ads by location', async () => {
      const response = await request(app)
        .get('/api/ads?location=London')
        .expect(200);

      expect(response.body).toHaveProperty('ads');
    });
  });

  describe('GET /api/ads/:id', () => {
    let adId: string;

    beforeEach(async () => {
      const ad = await Ad.create({
        title: 'Single Test Ad',
        description: 'Detailed description',
        category: 'Category',
        location: 'London',
        price: 100,
        userId: userId,
        status: 'approved',
      });
      adId = ad._id.toString();
    });

    it('should return a single ad by ID', async () => {
      const response = await request(app)
        .get(`/api/ads/${adId}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id');
    });

    it('should return 404 for non-existent ad', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .get(`/api/ads/${fakeId}`)
        .expect(404);
    });
  });

  describe('POST /api/ads', () => {
    it('should create a new ad with valid data', async () => {
      const adData = {
        title: 'New Ad Title Here',
        description: 'This is a new ad description that is long enough to pass validation requirements',
        category: 'Escort',
        location: 'London',
        price: 150,
      };

      const response = await request(app)
        .post('/api/ads')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(adData)
        .expect(201);

      expect(response.body).toHaveProperty('title', adData.title);
    });

    it('should fail without authentication', async () => {
      const adData = {
        title: 'New Ad',
        description: 'Description here that is long enough',
        category: 'Escort',
        location: 'London',
        price: 150,
      };

      await request(app)
        .post('/api/ads')
        .send(adData)
        .expect(401);
    });
  });

  describe('DELETE /api/ads/:id', () => {
    let adId: string;

    beforeEach(async () => {
      const ad = await Ad.create({
        title: 'Ad to Delete',
        description: 'Will be deleted',
        category: 'Category',
        location: 'London',
        price: 100,
        userId: userId,
        status: 'approved',
      });
      adId = ad._id.toString();
    });

    it('should delete an ad successfully', async () => {
      await request(app)
        .delete(`/api/ads/${adId}/user`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const deletedAd = await Ad.findById(adId);
      // Ad uses soft delete (isDeleted: true)
      expect(deletedAd?.isDeleted).toBe(true);
    });

    it('should fail without authentication', async () => {
      await request(app)
        .delete(`/api/ads/${adId}/user`)
        .expect(401);
    });
  });
});

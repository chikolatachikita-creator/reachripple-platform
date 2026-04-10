import request from 'supertest';
import createTestApp from '../testApp';
import User from '../../models/User';
import Ad from '../../models/Ad';
import Report from '../../models/Report';
import bcrypt from 'bcryptjs';

const app = createTestApp();

// Helper to create a valid ad
const createValidAd = async (userId: string) => {
  return Ad.create({
    title: 'Ad to Report',
    description: 'This ad may be reported for testing',
    location: 'Los Angeles',
    category: 'Services',
    price: 150,
    userId,
    status: 'approved',
  });
};

describe('Reports API', () => {
  let userToken: string;
  let adminToken: string;
  let userId: string;
  let adId: string;

  beforeEach(async () => {
    // Create regular user
    const userPassword = await bcrypt.hash('UserPass123!', 12);
    const user = await User.create({
      name: 'Report User',
      email: 'reporter@example.com',
      password: userPassword,
      role: 'user',
      status: 'active',
      isVerified: true,
    });
    userId = user._id.toString();

    // Create admin
    const adminPassword = await bcrypt.hash('AdminPass123!', 12);
    await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'admin',
      status: 'active',
      isVerified: true,
    });

    // Login as user
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'reporter@example.com', password: 'UserPass123!' });
    userToken = userLogin.body.accessToken;

    // Login as admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'AdminPass123!' });
    adminToken = adminLogin.body.accessToken;

    // Create an ad to report
    const ad = await createValidAd(userId);
    adId = ad._id.toString();
  });

  describe('POST /api/reports', () => {
    it('should create a report as authenticated user', async () => {
      const reportData = {
        adId,
        reason: 'Inappropriate content',
      };

      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reportData)
        .expect(201);

      expect(response.body).toHaveProperty('report');
      expect(response.body.report.reason).toBe('Inappropriate content');
      expect(response.body.report.status).toBe('pending');
    });

    it('should fail without authentication', async () => {
      await request(app)
        .post('/api/reports')
        .send({ adId, reason: 'Test reason' })
        .expect(401);
    });

    it('should fail with missing reason', async () => {
      await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ adId })
        .expect(400);
    });
  });

  describe('GET /api/reports (Admin)', () => {
    beforeEach(async () => {
      // Create some reports
      await Report.create({
        adId,
        reporterId: userId,
        reason: 'Report 1',
        status: 'pending',
      });
      await Report.create({
        adId,
        reporterId: userId,
        reason: 'Report 2',
        status: 'pending',
      });
    });

    it('should return all reports for admin', async () => {
      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('reports');
      expect(Array.isArray(response.body.reports)).toBe(true);
      expect(response.body.reports.length).toBeGreaterThanOrEqual(2);
    });

    it('should reject non-admin users', async () => {
      await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('PUT /api/reports/:id (Admin)', () => {
    let reportId: string;

    beforeEach(async () => {
      const report = await Report.create({
        adId,
        reporterId: userId,
        reason: 'Needs review',
        status: 'pending',
      });
      reportId = report._id.toString();
    });

    it('should update report status as admin', async () => {
      const response = await request(app)
        .put(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'reviewed' })
        .expect(200);

      expect(response.body.report.status).toBe('reviewed');
    });

    it('should dismiss a report', async () => {
      const response = await request(app)
        .put(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'dismissed' })
        .expect(200);

      expect(response.body.report.status).toBe('dismissed');
    });

    it('should reject non-admin update', async () => {
      await request(app)
        .put(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'reviewed' })
        .expect(403);
    });
  });
});

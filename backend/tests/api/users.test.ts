import request from 'supertest';
import createTestApp from '../testApp';
import User from '../../models/User';
import bcrypt from 'bcryptjs';

const app = createTestApp();

describe('User Routes API (Admin)', () => {
  let adminToken: string;
  let regularUserToken: string;
  let adminId: string;
  let regularUserId: string;

  beforeEach(async () => {
    // Create admin user
    const adminPassword = await bcrypt.hash('AdminPass123!', 12);
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'admin',
      status: 'active',
      isVerified: true,
    });
    adminId = admin._id.toString();

    // Create regular user
    const userPassword = await bcrypt.hash('UserPass123!', 12);
    const regularUser = await User.create({
      name: 'Regular User',
      email: 'user@example.com',
      password: userPassword,
      role: 'user',
      status: 'active',
      isVerified: true,
    });
    regularUserId = regularUser._id.toString();

    // Login as admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'AdminPass123!' });
    adminToken = adminLogin.body.accessToken;

    // Login as regular user
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'UserPass123!' });
    regularUserToken = userLogin.body.accessToken;
  });

  describe('GET /api/users', () => {
    it('should return list of users for admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // API returns array directly
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should reject non-admin users', async () => {
      await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return a single user by ID for admin', async () => {
      const response = await request(app)
        .get(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // API returns user directly
      expect(response.body.email).toBe('user@example.com');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user as admin', async () => {
      const newUser = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'NewPass123!',
        role: 'user',
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201);

      // API returns user directly
      expect(response.body.email).toBe('newuser@example.com');
    });

    it('should reject duplicate email', async () => {
      const duplicateUser = {
        name: 'Duplicate User',
        email: 'user@example.com', // Already exists
        password: 'DupPass123!',
      };

      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateUser)
        .expect(409); // Controller returns 409 for duplicates
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user as admin', async () => {
      const response = await request(app)
        .put(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      // API returns user directly
      expect(response.body.name).toBe('Updated Name');
    });
  });

  describe('PUT /api/users/:id/suspend', () => {
    it('should suspend a user as admin', async () => {
      const response = await request(app)
        .put(`/api/users/${regularUserId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // API returns user directly
      expect(response.body.status).toBe('suspended');
    });
  });

  describe('PUT /api/users/:id/reactivate', () => {
    it('should reactivate a suspended user as admin', async () => {
      // First suspend
      await request(app)
        .put(`/api/users/${regularUserId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Then reactivate
      const response = await request(app)
        .put(`/api/users/${regularUserId}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // API returns user directly
      expect(response.body.status).toBe('active');
    });
  });
});

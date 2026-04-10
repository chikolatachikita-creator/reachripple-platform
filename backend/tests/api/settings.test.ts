import request from 'supertest';
import createTestApp from '../testApp';
import User from '../../models/User';
import bcrypt from 'bcryptjs';
import { signAccessToken } from '../../utils/jwt';

const app = createTestApp();

async function createUserAndToken(overrides: Record<string, any> = {}) {
  const password = await bcrypt.hash('SecurePass123!', 12);
  const user = await User.create({
    name: 'Settings User',
    email: `settings-${Date.now()}@example.com`,
    password,
    role: 'user',
    status: 'active',
    ...overrides,
  });
  const token = signAccessToken(user._id.toString());
  return { user, token };
}

describe('Settings API', () => {
  describe('GET /api/admin/settings', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/admin/settings')
        .expect(401);
    });

    it('should require admin role', async () => {
      const { token } = await createUserAndToken();

      await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should return settings for admin', async () => {
      const { token } = await createUserAndToken({
        role: 'admin',
        email: `admin-settings-${Date.now()}@example.com`,
      });

      const response = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/admin/settings/pricing', () => {
    it('should require admin', async () => {
      const { token } = await createUserAndToken();

      await request(app)
        .get('/api/admin/settings/pricing')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });
});

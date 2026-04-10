import request from 'supertest';
import createTestApp from '../testApp';

const app = createTestApp();

describe('OAuth API', () => {
  describe('GET /api/auth/oauth/config', () => {
    it('should return OAuth configuration', async () => {
      const response = await request(app)
        .get('/api/auth/oauth/config')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('google');
      expect(response.body).toHaveProperty('github');
      expect(response.body.google).toHaveProperty('enabled');
      expect(response.body.github).toHaveProperty('enabled');
    });

    it('should report providers as disabled when env vars are missing', async () => {
      // In the test environment GOOGLE_CLIENT_ID etc. are not set
      const response = await request(app)
        .get('/api/auth/oauth/config')
        .expect(200);

      expect(response.body.google.enabled).toBe(false);
      expect(response.body.github.enabled).toBe(false);
    });
  });

  describe('POST /api/auth/oauth/google', () => {
    it('should require authorization code', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({})
        .expect(400);

      expect(response.body.message).toMatch(/code/i);
    });

    it('should return 501 when Google OAuth is not configured', async () => {
      // GOOGLE_CLIENT_ID is not set in tests
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ code: 'fake-auth-code' })
        .expect(501);

      expect(response.body.message).toMatch(/not configured/i);
    });
  });

  describe('POST /api/auth/oauth/github', () => {
    it('should require authorization code', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/github')
        .send({})
        .expect(400);

      expect(response.body.message).toMatch(/code/i);
    });

    it('should return 501 when GitHub OAuth is not configured', async () => {
      // GITHUB_CLIENT_ID is not set in tests
      const response = await request(app)
        .post('/api/auth/oauth/github')
        .send({ code: 'fake-auth-code' })
        .expect(501);

      expect(response.body.message).toMatch(/not configured/i);
    });
  });
});

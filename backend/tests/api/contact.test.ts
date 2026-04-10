import request from 'supertest';
import createTestApp from '../testApp';

const app = createTestApp();

describe('Contact API', () => {
  describe('POST /api/contact', () => {
    it('should accept a valid contact form submission', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          subject: 'General Enquiry',
          message: 'Hello, I have a question about the platform.',
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/received|thank/i);
    });

    it('should reject when name is missing', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({
          email: 'jane@example.com',
          subject: 'Help',
          message: 'Need help please.',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject when email is missing', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({
          name: 'Jane Doe',
          subject: 'Help',
          message: 'Need help please.',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject when email is invalid', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({
          name: 'Jane Doe',
          email: 'not-an-email',
          subject: 'Help',
          message: 'Need help please.',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject when message is missing', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({
          name: 'Jane',
          email: 'jane@example.com',
          subject: 'Help',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should accept a short but non-empty message', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({
          name: 'Jane',
          email: 'jane@example.com',
          subject: 'Help',
          message: 'Hi',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });
});

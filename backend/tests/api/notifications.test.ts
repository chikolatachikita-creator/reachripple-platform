import request from 'supertest';
import createTestApp from '../testApp';
import User from '../../models/User';
import Notification from '../../models/Notification';
import bcrypt from 'bcryptjs';

const app = createTestApp();

describe('Notifications API', () => {
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    // Create a user
    const password = await bcrypt.hash('TestPass123!', 12);
    const user = await User.create({
      name: 'Notification User',
      email: 'notif@example.com',
      password,
      role: 'user',
      status: 'active',
      isVerified: true,
    });
    userId = user._id.toString();

    // Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notif@example.com', password: 'TestPass123!' });
    userToken = loginResponse.body.accessToken;
  });

  describe('GET /api/notifications/my', () => {
    it('should return empty notifications initially', async () => {
      const response = await request(app)
        .get('/api/notifications/my')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('notifications');
      expect(response.body.notifications).toEqual([]);
    });

    it('should return user notifications', async () => {
      // Create notifications
      await Notification.create({
        user: userId,
        type: 'message',
        message: 'You have a new message',
        read: false,
      });
      await Notification.create({
        user: userId,
        type: 'alert',
        message: 'Your ad was approved',
        read: false,
      });

      const response = await request(app)
        .get('/api/notifications/my')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.notifications.length).toBe(2);
    });

    it('should fail without authentication', async () => {
      await request(app)
        .get('/api/notifications/my')
        .expect(401);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return 0 when no unread notifications', async () => {
      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.count).toBe(0);
    });

    it('should return correct unread count', async () => {
      await Notification.create({
        user: userId,
        type: 'message',
        message: 'Unread 1',
        read: false,
      });
      await Notification.create({
        user: userId,
        type: 'message',
        message: 'Unread 2',
        read: false,
      });
      await Notification.create({
        user: userId,
        type: 'message',
        message: 'Read message',
        read: true,
      });

      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.count).toBe(2);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    let notificationId: string;

    beforeEach(async () => {
      const notif = await Notification.create({
        user: userId,
        type: 'alert',
        message: 'Test notification',
        read: false,
      });
      notificationId = notif._id.toString();
    });

    it('should mark notification as read', async () => {
      const response = await request(app)
        .patch(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.notification.read).toBe(true);
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .patch(`/api/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/notifications/mark-all-read', () => {
    beforeEach(async () => {
      await Notification.create({
        user: userId,
        type: 'message',
        message: 'Notif 1',
        read: false,
      });
      await Notification.create({
        user: userId,
        type: 'message',
        message: 'Notif 2',
        read: false,
      });
    });

    it('should mark all notifications as read', async () => {
      await request(app)
        .patch('/api/notifications/mark-all-read')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify all are read
      const countResponse = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${userToken}`);

      expect(countResponse.body.count).toBe(0);
    });
  });
});

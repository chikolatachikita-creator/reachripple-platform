import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Routes
import authRoutes from '../routes/authRoutes';
import adRoutes from '../routes/adRoutes';
import userRoutes from '../routes/userRoutes';
import reportRoutes from '../routes/reportRoutes';
// import reviewRoutes from '../routes/reviewRoutes'; // Removed: review system deleted
import notificationRoutes from '../routes/notificationRoutes';
import contactRoutes from '../routes/contactRoutes';
import settingRoutes from '../routes/settingRoutes';
import locationRoutes from '../routes/locationRoutes';
// import creditRoutes from '../routes/creditRoutes'; // Removed: credits system replaced with direct pricing
// import chatRoutes from '../routes/chatRoutes'; // Removed: in-app messaging deleted

const createTestApp = () => {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // CORS
  app.use(cors({
    origin: '*',
    credentials: true,
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/ads', adRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/reports', reportRoutes);
  // app.use('/api/reviews', reviewRoutes); // Removed: review system deleted
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/contact', contactRoutes);
  app.use('/api/admin/settings', settingRoutes);
  app.use('/api/location', locationRoutes);
  // app.use('/api/credits', creditRoutes); // Removed: credits system replaced with direct pricing
  // app.use('/api/chat', chatRoutes); // Removed: in-app messaging deleted

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Test app error:', err.message);
    res.status(500).json({ message: err.message || 'Internal server error' });
  });

  return app;
};

export default createTestApp;

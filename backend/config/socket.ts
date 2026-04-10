import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

/**
 * Socket.io Configuration and Event Handlers
 * Handles real-time notifications and online status
 * (In-app messaging removed — users contact via phone/WhatsApp)
 */

// Map to store online users: userId -> socketId
const onlineUsers = new Map<string, Set<string>>();

// Singleton io instance — accessible via getIO()
let ioInstance: SocketIOServer | null = null;

/**
 * Get the Socket.IO server instance.
 * Returns null if not yet initialized.
 */
export function getIO(): SocketIOServer | null {
  return ioInstance;
}

export function initializeSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return next(new Error('Server misconfiguration: JWT_SECRET not set'));
      }
      const decoded = jwt.verify(token, jwtSecret);
      socket.data.userId = (decoded as any).id;
      socket.data.email = (decoded as any).email;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Connection event
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    logger.info(`User ${userId} connected with socket ${socket.id}`);

    // Join personal room for targeted notifications
    socket.join(userId);

    // Track user as online
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Broadcast user online status
    io.emit('user:online', { userId, isOnline: true });

    /**
     * EVENT: user:status
     * Broadcast user status (online/away/offline)
     */
    socket.on('user:status', (data: { status: 'online' | 'away' | 'offline' }) => {
      io.emit('user:status-update', {
        userId,
        status: data.status,
        timestamp: new Date(),
      });
    });

    /**
     * EVENT: disconnect
     * Handle user disconnect
     */
    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('user:online', { userId, isOnline: false });
        }
      }
      logger.debug(`User ${userId} disconnected`);
    });

    /**
     * EVENT: error
     * Handle socket errors
     */
    socket.on('error', (error: any) => {
      logger.error(`Socket error for user ${userId}:`, error);
    });
  });

  ioInstance = io;
  return io;
}

/**
 * Get online users
 */
export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers.keys());
}

/**
 * Check if user is online
 */
export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId) && onlineUsers.get(userId)!.size > 0;
}

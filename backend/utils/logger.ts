import winston, { Logger, LogEntry } from 'winston';
import path from 'path';
import fs from 'fs';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format with context and timestamps
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const logData = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta,
    };
    return JSON.stringify(logData);
  })
);

// Define console format (colorized for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] ${message}${metaStr}`;
  })
);

// Create logger instance
const logger: Logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'escort-platform-backend' },
  transports: [
    // Log errors to separate file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    // Log all messages to combined file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    // Log to console in development
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

/**
 * Enhanced logging with context and request tracking
 */
export const logInfo = (message: string, meta?: Record<string, any>) => {
  logger.info(message, meta);
};

export const logWarn = (message: string, meta?: Record<string, any>) => {
  logger.warn(message, meta);
};

export const logError = (message: string, error?: Error | string, meta?: Record<string, any>) => {
  const errorMeta = {
    ...meta,
    ...(error instanceof Error
      ? { error: error.message, stack: error.stack }
      : { error }),
  };
  logger.error(message, errorMeta);
};

export const logDebug = (message: string, meta?: Record<string, any>) => {
  logger.debug(message, meta);
};

/**
 * Express middleware for automatic request logging
 */
export const expressLogger = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  const requestId = req.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger.log(logLevel, `${req.method} ${req.originalUrl || req.path}`, {
      requestId,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
};

/**
 * Database operation logger
 */
export const logDbOperation = (operation: string, duration: number, meta?: Record<string, any>) => {
  logInfo(`[DB] ${operation}`, {
    operation,
    durationMs: duration,
    ...meta,
  });
};

/**
 * API call logger
 */
export const logApiCall = (endpoint: string, statusCode: number, duration: number, meta?: Record<string, any>) => {
  const logLevel = statusCode >= 400 ? 'warn' : 'info';
  logger.log(logLevel, `[API] ${endpoint}`, {
    endpoint,
    statusCode,
    durationMs: duration,
    ...meta,
  });
};

/**
 * Performance logger for tracking slow operations
 */
export const logPerformance = (operation: string, duration: number, threshold: number = 1000) => {
  const level = duration > threshold ? 'warn' : 'debug';
  logger.log(level, `[PERF] ${operation}`, {
    operation,
    durationMs: duration,
    slow: duration > threshold,
  });
};

export default logger;

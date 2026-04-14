import dotenv from "dotenv";
dotenv.config(); // Load env vars FIRST before any other imports

import express, { Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import path from "path";
import rateLimit from "express-rate-limit";
import http from "http";
import cookieParser from "cookie-parser";

import adRoutes from "./routes/adRoutes";
import aiRoutes from "./routes/aiRoutes";
import userRoutes from "./routes/userRoutes";
import reportRoutes from "./routes/reportRoutes";
import settingRoutes from "./routes/settingRoutes";
import authRoutes from "./routes/authRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import savedProfileRoutes from "./routes/savedProfileRoutes";
import searchHistoryRoutes from "./routes/searchHistoryRoutes";
// import reviewRoutes from "./routes/reviewRoutes"; // Removed: review system deleted
// import chatRoutes from "./routes/chatRoutes"; // Removed: in-app messaging deleted (contact via phone/WhatsApp)
import locationRoutes from "./routes/locationRoutes";
import homeRoutes from "./routes/homeRoutes";
import boostRoutes from "./routes/boostRoutes";
// import creditRoutes from "./routes/creditRoutes"; // Removed: credits system replaced with direct pricing
import tierRoutes from "./routes/tierRoutes";
import { processSubscriptionRenewals } from "./routes/tierRoutes";
import healthRoutes from "./routes/healthRoutes";
import verificationRoutes from "./routes/verificationRoutes";
import contactRoutes from "./routes/contactRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";

// Admin routes
import adminStats from "./src/routes/adminStats";
import adminAds from "./src/routes/adminAds";
import adminUsers from "./src/routes/adminUsers";
import adminReports from "./src/routes/adminReports";
import adminRevenue from "./src/routes/adminRevenue";
import adminAuth from "./src/routes/adminAuth";
import adminLogs from "./src/routes/adminLogs";
import adminAnalytics from "./src/routes/adminAnalytics";
import adminModeration from "./src/routes/adminModeration";
import adminNetwork from "./src/routes/adminNetwork";

// Middleware
import auth from "./middleware/auth";
import adminCheck from "./middleware/admin";
import { errorHandler } from "./middleware/errorHandler";

// Services
import { initRedis } from "./services/cacheService";
import { initializeSocket } from "./config/socket";
import { runScheduledBumpOperations } from "./services/bumpService";
import { checkExpiringTiers } from "./services/expiryNotificationService";
import { startScheduler, migrateToRedisScheduler } from "./services/tapUpScheduler";
import { runPatternScan } from "./services/patternDetectionService";
import { runClusterDetection } from "./services/networkDetectionService";
// import { runInvoiceExpiry } from "./services/invoiceExpiryService"; // Removed: credits/invoice system deprecated
import { requestTimingMiddleware } from "./services/observabilityService";
import { recomputeAllVisibilityScores, pruneOldMetricEvents } from "./services/visibilityScoreService";

// Rate limiters (centralized config)
import {
  locationRateLimiter,
  adsRateLimiter,
  authRateLimiter,
  searchRateLimiter,
  adCreationRateLimiter,
} from "./config/rateLimits";

// Structured logging
import logger, { logInfo, logWarn, logError, logDebug, expressLogger } from "./utils/logger";

// ============ PRODUCTION ENV VALIDATION ============
if (process.env.NODE_ENV === "production") {
  const required = ["JWT_SECRET", "JWT_REFRESH_SECRET", "MONGO_URI", "CORS_ORIGIN", "FRONTEND_URL"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars for production: ${missing.join(", ")}`);
  }
}

const app = express();

// Create HTTP server for Socket.io
const httpServer = http.createServer(app);

// Initialize Socket.io
initializeSocket(httpServer);

// Initialize Redis cache (optional - will work without it)
initRedis();

// ============ REQUEST LOGGING ============
// Log all incoming requests
app.use(expressLogger);

// ============ OBSERVABILITY ============
// Track request timing and slow queries
app.use(requestTimingMiddleware);

// ============ SECURITY MIDDLEWARE ============

// Helmet security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images to be served
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],  // React needs unsafe-inline/eval
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "https:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,  // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS configuration
const configuredOrigins = (process.env.CORS_ORIGIN?.split(",") || [])
  .map((origin) => origin.trim())
  .filter(Boolean);
const localDevOrigins = [
  "http://localhost:3000",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3002",
];
const allowedOrigins = Array.from(new Set([...localDevOrigins, ...configuredOrigins]));

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);

    // Allow flexible origins in development so temporary preview/tunnel URLs work.
    if (process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow all Render subdomains (e.g. reachripple-live-web.onrender.com)
    if (origin.endsWith(".onrender.com") && origin.startsWith("https://")) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// SECURITY: Sanitize user input to prevent NoSQL injection
app.use(mongoSanitize());

// SECURITY: Cookie parser for session management
app.use(cookieParser());

// Serve uploaded files (with basic security headers)
app.use("/uploads", (req, res, next) => {
  // Prevent directory listing and add security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, max-age=3600");
  next();
}, express.static(path.join(__dirname, "..", "uploads")));

// ============ RATE LIMITING ============

// General API rate limiting (relaxed for development)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 300 : 1000, // 1000 requests per 15 minutes (development)
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Note: Endpoint-specific rate limiters (auth, location, ads, search) 
// are imported from ./config/rateLimits and applied to individual routes

// Apply general rate limiting to all API routes
app.use("/api", apiLimiter);

// ============ HEALTH CHECK ============
app.use("/health", healthRoutes);

// ============ AUTH ROUTES (with strict rate limiting) ============
// Apply rate limiting BEFORE the routes
app.post("/api/auth/login", authRateLimiter);
app.post("/api/auth/register", authRateLimiter);
app.post("/api/auth/forgot-password", authRateLimiter);
app.post("/api/auth/reset-password", authRateLimiter);
app.post("/api/auth/resend-verification", authRateLimiter);

// Register auth routes
app.use("/api/auth", authRoutes);

// ============ PUBLIC API ROUTES ============
app.use("/api/ai", aiRoutes);
app.use("/api/ads", adsRateLimiter, adRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin/settings", settingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/saved-profiles", savedProfileRoutes);
app.use("/api/search-history", searchRateLimiter, searchHistoryRoutes);
// app.use("/api/reviews", reviewRoutes); // Removed: review system deleted
// app.use("/api/chat", auth, chatRoutes); // Removed: in-app messaging deleted (contact via phone/WhatsApp)
app.use("/api/location", locationRateLimiter, locationRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/boost", boostRoutes);
// app.use("/api/credits", creditRoutes); // Removed: credits system replaced with direct pricing
app.use("/api/tiers", tierRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/analytics", analyticsRoutes);

// ============ ADMIN ROUTES ============
// Admin auth (with rate limiting for brute-force protection)
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  message: { message: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/admin/auth", adminAuthLimiter, adminAuth);

// Admin protected routes (require auth + admin role)
app.use("/api/admin/stats", auth, adminCheck, adminStats);
app.use("/api/admin/ads", auth, adminCheck, adminAds);
app.use("/api/admin/users", auth, adminCheck, adminUsers);
app.use("/api/admin/reports", auth, adminCheck, adminReports);
app.use("/api/admin/revenue", auth, adminCheck, adminRevenue);
app.use("/api/admin/logs", auth, adminCheck, adminLogs);
app.use("/api/admin/analytics", auth, adminCheck, adminAnalytics);
app.use("/api/admin/moderation", auth, adminCheck, adminModeration);
app.use("/api/admin/network", auth, adminCheck, adminNetwork);

// ============ ERROR HANDLING ============
// Central error handler — catches all thrown/next(err) errors
app.use(errorHandler);

// ============ DATABASE & SERVER ============
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reachripple-dev";
const PORT = process.env.PORT || 3001;

// Try to connect to MongoDB, but start server anyway for testing
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    logInfo("MongoDB connected successfully", { uri: MONGO_URI.replace(/:[^:]*@/, ":****@") });
    
    // Start scheduled bump operations after DB connection
    // Run immediately on startup, then every 5 minutes
    runScheduledBumpOperations().catch(err => {
      logWarn("Initial bump service run failed", { error: err.message });
    });
    
    // Schedule bump operations every 5 minutes
    const BUMP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    setInterval(() => {
      runScheduledBumpOperations().catch(err => {
        logError("Scheduled bump service error", err);
      });
    }, BUMP_INTERVAL_MS);
    
    logInfo("Bump service scheduler started", { intervalMs: BUMP_INTERVAL_MS });
    
    // Run expiry notification checks every hour
    const EXPIRY_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
    checkExpiringTiers().catch(err => {
      logWarn("Initial expiry notification check failed", { error: err.message });
    });
    setInterval(() => {
      checkExpiringTiers().catch(err => {
        logError("Scheduled expiry notification check error", err);
      });
    }, EXPIRY_CHECK_INTERVAL_MS);
    logInfo("Expiry notification scheduler started", { intervalMs: EXPIRY_CHECK_INTERVAL_MS });
    
    // Initialize Redis-based Tap Up scheduler
    await migrateToRedisScheduler();
    startScheduler();
    logInfo("Tap Up Redis scheduler initialized");

    // Anti-trafficking pattern detection — every 24 hours
    const PATTERN_SCAN_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
    setInterval(() => {
      runPatternScan().catch(err => {
        logError("Scheduled pattern scan error", err);
      });
    }, PATTERN_SCAN_INTERVAL_MS);
    logInfo("Pattern detection scheduler started", { intervalMs: PATTERN_SCAN_INTERVAL_MS });

    // Network cluster detection — every 24 hours (offset 1 hour from pattern scan)
    const CLUSTER_SCAN_INTERVAL_MS = 24 * 60 * 60 * 1000;
    setTimeout(() => {
      runClusterDetection().catch(err => {
        logWarn("Initial cluster detection failed", { error: err.message });
      });
      setInterval(() => {
        runClusterDetection().catch(err => {
          logError("Scheduled cluster detection error", err);
        });
      }, CLUSTER_SCAN_INTERVAL_MS);
    }, 60 * 60 * 1000); // Start 1 hour after boot
    logInfo("Network cluster detection scheduler registered");

    // Invoice auto-expiry — disabled (credits/invoice system deprecated)
    // const INVOICE_EXPIRY_INTERVAL_MS = 60 * 60 * 1000;
    // runInvoiceExpiry().catch(err => {
    //   logWarn("Initial invoice expiry run failed", { error: err.message });
    // });
    // setInterval(() => {
    //   runInvoiceExpiry().catch(err => {
    //     logError("Scheduled invoice expiry error", err);
    //   });
    // }, INVOICE_EXPIRY_INTERVAL_MS);

    // Visibility score recomputation — every 30 minutes
    const VISIBILITY_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
    recomputeAllVisibilityScores().catch(err => {
      logWarn("Initial visibility score recomputation failed", { error: err.message });
    });
    pruneOldMetricEvents().catch(err => {
      logWarn("Initial metric event pruning failed", { error: err.message });
    });
    setInterval(() => {
      recomputeAllVisibilityScores().catch(err => {
        logError("Scheduled visibility recomputation error", err);
      });
      pruneOldMetricEvents().catch(err => {
        logError("Scheduled metric pruning error", err);
      });
    }, VISIBILITY_INTERVAL_MS);
    logInfo("Visibility score scheduler started", { intervalMs: VISIBILITY_INTERVAL_MS });

    // Subscription renewal check — every hour
    const RENEWAL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
    setInterval(() => {
      processSubscriptionRenewals().catch(err => {
        logError("Subscription renewal cron error", err);
      });
    }, RENEWAL_INTERVAL_MS);
    logInfo("Subscription renewal scheduler started", { intervalMs: RENEWAL_INTERVAL_MS });
  })
  .catch((err) => {
    logWarn("MongoDB connection error - running in fallback mode", {
      error: err.message,
      uri: MONGO_URI.replace(/:[^:]*@/, ":****@"),
    });
    logInfo("Server will start but database features won't work. Install MongoDB or use Docker.", {
      mongoUri: MONGO_URI.replace(/:[^:]*@/, ":****@"),
    });
  });

// Always start the server (for testing frontend)
const server = httpServer.listen(PORT, () => {
  logInfo("Server started successfully", {
    port: PORT,
    env: process.env.NODE_ENV || "development",
    mongoStatus: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    url: `http://localhost:${PORT}`,
  });
});

// Handle server errors
server.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    logError(`Port ${PORT} is already in use. Try killing other processes or using a different port.`, err, {
      port: PORT,
      code: err.code,
    });
  } else {
    logError("Server error", err, { code: err.code });
  }
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logInfo("SIGTERM signal received - shutting down gracefully", { timestamp: new Date() });
  server.close(async () => {
    try {
      await mongoose.connection.close();
      logInfo("Database connection closed successfully");
    } catch (err) {
      logError("Error closing database connection", err instanceof Error ? err : new Error(String(err)));
    }
    process.exit(0);
  });
});

process.on("uncaughtException", (err) => {
  logError("Uncaught Exception - application terminating", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logError("Unhandled Promise Rejection", reason as Error, {
    promise: promise.toString(),
  });
  process.exit(1);
});

export default app;
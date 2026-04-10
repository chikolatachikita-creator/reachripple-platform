import { Router } from "express";
import { 
  register, 
  login, 
  refresh, 
  getMe, 
  updateProfile, 
  changePassword,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  logout,
  exportUserData,
  deleteAccount
} from "../controllers/authController";
import { googleCallback, githubCallback, getOAuthConfig } from "../controllers/oauthController";
import auth from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema
} from "../validators/schemas";

const router = Router();

// OAuth routes (public)
router.get("/oauth/config", getOAuthConfig);
router.post("/oauth/google", googleCallback);
router.post("/oauth/github", githubCallback);

// Public routes
router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.post("/refresh", validateBody(refreshTokenSchema), refresh);
router.post("/verify-email", verifyEmail);
router.post("/forgot-password", validateBody(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validateBody(resetPasswordSchema), resetPassword);

// Protected routes (require authentication)
router.get("/me", auth, getMe);
router.post("/logout", auth, logout);
router.put("/profile", auth, validateBody(updateProfileSchema), updateProfile);
router.put("/password", auth, validateBody(changePasswordSchema), changePassword);
router.post("/resend-verification", auth, resendVerification);
router.get("/data-export", auth, exportUserData);
router.delete("/account", auth, deleteAccount);

export default router;
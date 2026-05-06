import { Router } from "express";
import multer from "multer";
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
  deleteAccount,
  uploadAvatar
} from "../controllers/authController";
import { googleCallback, githubCallback, facebookCallback, appleCallback, getOAuthConfig } from "../controllers/oauthController";
import auth from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { getAdStorage } from "../services/uploadService";
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

const AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const avatarUpload = multer({
  storage: getAdStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!AVATAR_MIME.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG or WebP images are allowed"));
    }
    cb(null, true);
  },
});

// OAuth routes (public)
router.get("/oauth/config", getOAuthConfig);
router.post("/oauth/google", googleCallback);
router.post("/oauth/github", githubCallback);
router.post("/oauth/facebook", facebookCallback);
router.post("/oauth/apple", appleCallback);

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
router.post("/avatar", auth, avatarUpload.single("avatar"), uploadAvatar);
router.post("/resend-verification", auth, resendVerification);
router.get("/data-export", auth, exportUserData);
router.delete("/account", auth, deleteAccount);

export default router;
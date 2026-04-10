import express from "express";
import { adminLogin, refreshToken, logoutAdmin } from "../controllers/adminAuthController";

const router = express.Router();

router.post("/login", adminLogin);
router.post("/refresh", refreshToken);
router.post("/logout", logoutAdmin);

export default router;

import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  suspendUser,
  reactivateUser,
} from "../controllers/userController";
import auth from "../middleware/auth";
import admin from "../middleware/admin";

const router = Router();

// All user management = admin-only
router.get("/", auth, admin, getUsers);
router.get("/:id", auth, admin, getUserById);
router.post("/", auth, admin, createUser);
router.put("/:id", auth, admin, updateUser);
router.put("/:id/suspend", auth, admin, suspendUser);
router.put("/:id/reactivate", auth, admin, reactivateUser);

export default router;
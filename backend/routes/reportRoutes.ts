import { Router } from "express";
import {
  getReports,
  createReport,
  updateReport,
} from "../controllers/reportController";
import auth from "../middleware/auth";
import admin from "../middleware/admin";

const router = Router();

// Admin – review all reports
router.get("/", auth, admin, getReports);

// Any logged-in user can create a report
router.post("/", auth, createReport);

// Admin – update status, take action
router.put("/:id", auth, admin, updateReport);

export default router;
import express from "express";
import {
  getReports,
  resolveReport,
} from "../controllers/adminReportsController";

const router = express.Router();

router.get("/", getReports);
router.patch("/:id/resolve", resolveReport);

export default router;

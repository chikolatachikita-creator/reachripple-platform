import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import { validatePassword } from "../config/security";
import logger from "../utils/logger";

// GET /users - SECURITY: Never expose passwords
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.json(users);
  } catch (err: any) {
    logger.error("Get users error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// GET /users/:id - SECURITY: Never expose password
export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  } catch (err: any) {
    logger.error("Get user by id error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// POST /users
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    // SECURITY: Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        message: "Password does not meet requirements",
        errors: passwordValidation.errors
      });
    }

    // SECURITY: Use 12 rounds for consistency and security
    const hashed = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role || "user",
    });

    const userObj = user.toObject() as any;
    delete userObj.password;
    return res.status(201).json(userObj);
  } catch (err: any) {
    logger.error("Create user error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// PUT /users/:id
export const updateUser = async (req: Request, res: Response) => {
  try {
    const update: any = { ...req.body };

    if (req.body.password) {
      // SECURITY: Validate password strength before hashing
      const passwordValidation = validatePassword(req.body.password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          message: "Password does not meet requirements",
          errors: passwordValidation.errors
        });
      }
      // SECURITY: Use 12 rounds for consistency
      update.password = await bcrypt.hash(req.body.password, 12);
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
    }).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json(user);
  } catch (err: any) {
    logger.error("Update user error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// PUT /users/:id/suspend
export const suspendUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "suspended" },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json(user);
  } catch (err: any) {
    logger.error("Suspend user error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// PUT /users/:id/reactivate
export const reactivateUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "active" },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json(user);
  } catch (err: any) {
    logger.error("Reactivate user error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
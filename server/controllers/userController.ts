import { Response } from "express";
import { UserRepository } from "../repositories/userRepository.js";
import { ActivityLogRepository } from "../repositories/activityLogRepository.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";

export class UserController {
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized access" });
        return;
      }

      const user = await UserRepository.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, error: "User account not found" });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          monthly_income: user.monthly_income,
          currency: user.currency,
          profile_picture: user.profile_picture,
          created_at: user.created_at,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Failed to retrieve user profile",
      });
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const { name, monthlyIncome, currency, profilePicture } = req.body;
      const updates: any = {};

      if (name !== undefined) updates.name = name.trim();
      if (currency !== undefined) updates.currency = currency.trim();
      if (profilePicture !== undefined) updates.profilePicture = profilePicture;

      if (monthlyIncome !== undefined) {
        const parsed = parseFloat(monthlyIncome);
        if (isNaN(parsed) || parsed < 0) {
          res.status(400).json({ success: false, error: "Monthly income must be a non-negative decimal" });
          return;
        }
        updates.monthlyIncome = parsed;
      }

      const updated = await UserRepository.update(userId, updates);
      if (!updated) {
        res.status(404).json({ success: false, error: "User profile update failed" });
        return;
      }

      await ActivityLogRepository.log(userId, "PROFILE_UPDATED", "Updated user profile settings");

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          monthly_income: updated.monthly_income,
          currency: updated.currency,
          profile_picture: updated.profile_picture,
          created_at: updated.created_at,
        },
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to update profile settings",
      });
    }
  }
}

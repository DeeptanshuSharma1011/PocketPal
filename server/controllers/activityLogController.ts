import { Response } from "express";
import { ActivityLogRepository } from "../repositories/activityLogRepository.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";

export class ActivityLogController {
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized access" });
        return;
      }

      const logs = await ActivityLogRepository.findAll(userId);

      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Failed to retrieve activity history",
      });
    }
  }
}

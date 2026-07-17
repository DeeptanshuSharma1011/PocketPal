import { Response } from "express";
import { DashboardService } from "../services/dashboardService.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";

export class DashboardController {
  static async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized access" });
        return;
      }

      const { year, month } = req.query;
      const parsedYear = year ? parseInt(year as string, 10) : undefined;
      const parsedMonth = month ? parseInt(month as string, 10) : undefined;

      const summary = await DashboardService.getSummary(userId, parsedYear, parsedMonth);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Failed to retrieve dashboard summaries",
      });
    }
  }
}

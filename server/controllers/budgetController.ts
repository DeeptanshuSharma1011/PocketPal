import { Response } from "express";
import { BudgetRepository } from "../repositories/budgetRepository.js";
import { ActivityLogRepository } from "../repositories/activityLogRepository.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";

export class BudgetController {
  static async getBudgetsByPeriod(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized access" });
        return;
      }

      const { month, year } = req.query;
      const now = new Date();
      const activeMonth = month ? parseInt(month as string, 10) : now.getMonth() + 1;
      const activeYear = year ? parseInt(year as string, 10) : now.getFullYear();

      if (isNaN(activeMonth) || activeMonth < 1 || activeMonth > 12 || isNaN(activeYear)) {
        res.status(400).json({ success: false, error: "Invalid month or year parameters" });
        return;
      }

      const budgets = await BudgetRepository.findByPeriod(userId, activeMonth, activeYear);

      res.status(200).json({
        success: true,
        data: budgets,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Failed to retrieve monthly budgets",
      });
    }
  }

  static async upsertBudget(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized access" });
        return;
      }

      const { categoryId, amount, month, year } = req.body;

      if (amount === undefined || !month || !year) {
        res.status(400).json({
          success: false,
          error: "Missing parameters. Required: amount, month (1-12), year",
        });
        return;
      }

      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        res.status(400).json({
          success: false,
          error: "Amount must be a positive decimal number",
        });
        return;
      }

      const parsedMonth = parseInt(month, 10);
      const parsedYear = parseInt(year, 10);

      if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12 || isNaN(parsedYear)) {
        res.status(400).json({
          success: false,
          error: "Month must be between 1 and 12, and year must be valid",
        });
        return;
      }

      const catId = categoryId ? parseInt(categoryId, 10) : null;

      const budget = await BudgetRepository.upsert(userId, catId, numericAmount, parsedMonth, parsedYear);

      await ActivityLogRepository.log(
        userId,
        "BUDGET_UPSERT",
        `Configured budget of ${numericAmount} for period ${parsedYear}-${parsedMonth} (Category ID: ${catId || "Overall"})`
      );

      res.status(200).json({
        success: true,
        message: "Monthly budget configured successfully",
        data: budget,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to upsert monthly budget",
      });
    }
  }

  static async deleteBudget(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId || !id) {
        res.status(400).json({ success: false, error: "Missing required parameters" });
        return;
      }

      const budgetId = parseInt(id, 10);
      const success = await BudgetRepository.delete(budgetId, userId);

      if (!success) {
        res.status(404).json({ success: false, error: "Monthly budget not found or unauthorized" });
        return;
      }

      await ActivityLogRepository.log(userId, "BUDGET_DELETED", `Removed monthly budget ID ${budgetId}`);

      res.status(200).json({
        success: true,
        message: "Budget limit deleted successfully",
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to remove budget",
      });
    }
  }
}

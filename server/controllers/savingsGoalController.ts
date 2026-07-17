import { Response } from "express";
import { SavingsGoalRepository } from "../repositories/savingsGoalRepository.js";
import { ActivityLogRepository } from "../repositories/activityLogRepository.js";
import { NotificationRepository } from "../repositories/notificationRepository.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";

export class SavingsGoalController {
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized access" });
        return;
      }

      const goals = await SavingsGoalRepository.findAll(userId);

      // Add helper progress percentage in response
      const augmentedGoals = goals.map((g) => {
        const percentage = g.target_amount > 0 ? (g.current_savings / g.target_amount) * 100 : 0;
        return {
          ...g,
          progress_percentage: parseFloat(percentage.toFixed(1)),
        };
      });

      res.status(200).json({
        success: true,
        data: augmentedGoals,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Failed to retrieve savings goals",
      });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const { name, targetAmount, currentSavings, deadline } = req.body;

      if (!name || !targetAmount || !deadline) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: name, targetAmount, deadline (YYYY-MM-DD)",
        });
        return;
      }

      const parsedTarget = parseFloat(targetAmount);
      const parsedCurrent = currentSavings !== undefined ? parseFloat(currentSavings) : 0.0;

      if (isNaN(parsedTarget) || parsedTarget <= 0 || isNaN(parsedCurrent) || parsedCurrent < 0) {
        res.status(400).json({
          success: false,
          error: "Amounts must be valid positive decimal numbers",
        });
        return;
      }

      const goal = await SavingsGoalRepository.create(userId, {
        name,
        targetAmount: parsedTarget,
        currentSavings: parsedCurrent,
        deadline,
      });

      await ActivityLogRepository.log(userId, "SAVINGS_GOAL_CREATED", `Created savings goal "${name}" with target ${parsedTarget}`);

      // If already achieved at creation
      if (parsedCurrent >= parsedTarget) {
        await NotificationRepository.create(userId, {
          title: "🎉 Goal Achieved Immediately!",
          message: `Congratulations! You've achieved your savings goal "${name}"! target: ${parsedTarget}`,
          type: "success",
        });
      }

      res.status(201).json({
        success: true,
        message: "Savings goal created successfully",
        data: {
          ...goal,
          progress_percentage: parseFloat((parsedTarget > 0 ? (parsedCurrent / parsedTarget) * 100 : 0).toFixed(1)),
        },
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to create savings goal",
      });
    }
  }

  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId || !id) {
        res.status(400).json({ success: false, error: "Missing parameters" });
        return;
      }

      const { name, targetAmount, currentSavings, deadline } = req.body;
      const updates: any = {};

      if (name !== undefined) updates.name = name;
      if (deadline !== undefined) updates.deadline = deadline;

      if (targetAmount !== undefined) {
        const parsed = parseFloat(targetAmount);
        if (isNaN(parsed) || parsed <= 0) {
          res.status(400).json({ success: false, error: "Target amount must be a positive decimal number" });
          return;
        }
        updates.targetAmount = parsed;
      }

      if (currentSavings !== undefined) {
        const parsed = parseFloat(currentSavings);
        if (isNaN(parsed) || parsed < 0) {
          res.status(400).json({ success: false, error: "Current savings must be a positive decimal number" });
          return;
        }
        updates.currentSavings = parsed;
      }

      const goalId = parseInt(id, 10);
      const original = await SavingsGoalRepository.findById(goalId, userId);
      if (!original) {
        res.status(404).json({ success: false, error: "Savings goal not found" });
        return;
      }

      const updated = await SavingsGoalRepository.update(goalId, userId, updates);
      if (!updated) {
        res.status(404).json({ success: false, error: "Savings goal update failed" });
        return;
      }

      await ActivityLogRepository.log(userId, "SAVINGS_GOAL_UPDATED", `Updated savings goal "${updated.name}"`);

      // Trigger achievement notification if transitioned from unachieved to achieved
      if (
        updated.current_savings >= updated.target_amount &&
        original.current_savings < original.target_amount
      ) {
        await NotificationRepository.create(userId, {
          title: "🎉 Savings Goal Achieved!",
          message: `Incredible! You have officially achieved your savings goal "${updated.name}" of ${updated.target_amount}!`,
          type: "success",
        });
      }

      res.status(200).json({
        success: true,
        message: "Savings goal updated successfully",
        data: {
          ...updated,
          progress_percentage: parseFloat((updated.target_amount > 0 ? (updated.current_savings / updated.target_amount) * 100 : 0).toFixed(1)),
        },
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to update savings goal",
      });
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId || !id) {
        res.status(400).json({ success: false, error: "Missing required parameters" });
        return;
      }

      const goalId = parseInt(id, 10);
      const success = await SavingsGoalRepository.delete(goalId, userId);

      if (!success) {
        res.status(404).json({ success: false, error: "Savings goal not found or unauthorized" });
        return;
      }

      await ActivityLogRepository.log(userId, "SAVINGS_GOAL_DELETED", `Deleted savings goal ID ${goalId}`);

      res.status(200).json({
        success: true,
        message: "Savings goal deleted successfully",
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to delete savings goal",
      });
    }
  }
}

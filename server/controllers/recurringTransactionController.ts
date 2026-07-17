import { Response } from "express";
import { RecurringTransactionRepository } from "../repositories/recurringTransactionRepository.js";
import { ActivityLogRepository } from "../repositories/activityLogRepository.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";

export class RecurringTransactionController {
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized access" });
        return;
      }

      const list = await RecurringTransactionRepository.findAll(userId);

      res.status(200).json({
        success: true,
        data: list,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Failed to retrieve recurring rules",
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

      const { type, titleOrSource, amount, categoryId, frequency, nextExecutionDate, notes } = req.body;

      if (!type || !titleOrSource || !amount || !frequency || !nextExecutionDate) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: type ('income'|'expense'), titleOrSource, amount, frequency, nextExecutionDate (YYYY-MM-DD)",
        });
        return;
      }

      if (type !== "income" && type !== "expense") {
        res.status(400).json({ success: false, error: "Type must be either 'income' or 'expense'" });
        return;
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        res.status(400).json({ success: false, error: "Amount must be a positive decimal number" });
        return;
      }

      const rec = await RecurringTransactionRepository.create(userId, {
        type,
        titleOrSource,
        amount: parsedAmount,
        categoryId: categoryId ? parseInt(categoryId, 10) : null,
        frequency,
        nextExecutionDate,
        notes,
      });

      await ActivityLogRepository.log(
        userId,
        "RECURRING_CREATED",
        `Created automated ${frequency} rule for "${titleOrSource}" of ${parsedAmount}`
      );

      res.status(201).json({
        success: true,
        message: "Automated recurring rule registered",
        data: rec,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to register recurring rule",
      });
    }
  }

  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId || !id) {
        res.status(400).json({ success: false, error: "Missing identity references" });
        return;
      }

      const { titleOrSource, amount, categoryId, frequency, nextExecutionDate, isActive, notes } = req.body;
      const updates: any = {};

      if (titleOrSource !== undefined) updates.titleOrSource = titleOrSource;
      if (categoryId !== undefined) updates.categoryId = categoryId ? parseInt(categoryId, 10) : null;
      if (frequency !== undefined) updates.frequency = frequency;
      if (nextExecutionDate !== undefined) updates.nextExecutionDate = nextExecutionDate;
      if (isActive !== undefined) updates.isActive = isActive === true || isActive === "true";
      if (notes !== undefined) updates.notes = notes;

      if (amount !== undefined) {
        const parsed = parseFloat(amount);
        if (isNaN(parsed) || parsed <= 0) {
          res.status(400).json({ success: false, error: "Amount must be positive decimal" });
          return;
        }
        updates.amount = parsed;
      }

      const recId = parseInt(id, 10);
      const updated = await RecurringTransactionRepository.update(recId, userId, updates);

      if (!updated) {
        res.status(404).json({ success: false, error: "Automated rule not found or unauthorized to edit" });
        return;
      }

      await ActivityLogRepository.log(userId, "RECURRING_UPDATED", `Modified active state/terms for rule ID ${recId}`);

      res.status(200).json({
        success: true,
        message: "Recurring rule configured successfully",
        data: updated,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to update recurring rule",
      });
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId || !id) {
        res.status(400).json({ success: false, error: "Missing references" });
        return;
      }

      const recId = parseInt(id, 10);
      const success = await RecurringTransactionRepository.delete(recId, userId);

      if (!success) {
        res.status(404).json({ success: false, error: "Rule not found or unauthorized" });
        return;
      }

      await ActivityLogRepository.log(userId, "RECURRING_DELETED", `Revoked automated rule ID ${recId}`);

      res.status(200).json({
        success: true,
        message: "Automated recurring rule cancelled successfully",
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to cancel rule",
      });
    }
  }
}

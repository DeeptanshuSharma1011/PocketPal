import { Response } from "express";
import { ExpenseRepository, ExpenseQueryParams } from "../repositories/expenseRepository.js";
import { BudgetAlertService } from "../services/budgetAlertService.js";
import { ActivityLogRepository } from "../repositories/activityLogRepository.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";

export class ExpenseController {
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized access" });
        return;
      }

      const {
        limit,
        offset,
        sortBy,
        sortOrder,
        startDate,
        endDate,
        categoryId,
        paymentMethod,
        search,
        includeDeleted,
      } = req.query;

      const queryParams: ExpenseQueryParams = {
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        sortBy: sortBy as "date" | "amount" | "created_at" | undefined,
        sortOrder: sortOrder as "ASC" | "DESC" | undefined,
        startDate: startDate as string,
        endDate: endDate as string,
        categoryId: categoryId ? parseInt(categoryId as string, 10) : undefined,
        paymentMethod: paymentMethod as string,
        search: search as string,
        includeDeleted: includeDeleted === "true",
      };

      const result = await ExpenseRepository.findAll(userId, queryParams);

      res.status(200).json({
        success: true,
        data: result.rows,
        meta: {
          total: result.totalCount,
          limit: queryParams.limit || 10,
          offset: queryParams.offset || 0,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Failed to retrieve expenses",
      });
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId || !id) {
        res.status(400).json({ success: false, error: "Missing identity references" });
        return;
      }

      const expense = await ExpenseRepository.findById(parseInt(id, 10), userId);
      if (!expense) {
        res.status(404).json({ success: false, error: "Expense record not found" });
        return;
      }

      res.status(200).json({
        success: true,
        data: expense,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Failed to retrieve expense",
      });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized access" });
        return;
      }

      const { title, amount, categoryId, paymentMethod, date, notes, receiptUrl, receiptScreenshot } = req.body;

      if (!title || !amount || !date) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: title, amount, date",
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

      const expense = await ExpenseRepository.create(userId, {
        title,
        amount: numericAmount,
        categoryId: categoryId ? parseInt(categoryId, 10) : null,
        paymentMethod: paymentMethod || "Cash",
        date,
        notes,
        receiptUrl,
        receiptScreenshot,
      });

      // Audit Log
      await ActivityLogRepository.log(
        userId,
        "EXPENSE_CREATED",
        `Recorded expense "${title}" of ${numericAmount}`
      );

      // Async Budget Limit Check (automatically triggers in-app warning triggers if needed)
      await BudgetAlertService.checkBudgets(userId, date);

      res.status(201).json({
        success: true,
        message: "Expense recorded successfully",
        data: expense,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to record expense",
      });
    }
  }

  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId || !id) {
        res.status(400).json({ success: false, error: "Missing required parameters" });
        return;
      }

      const { title, amount, categoryId, paymentMethod, date, notes, receiptUrl, receiptScreenshot } = req.body;

      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (amount !== undefined) {
        const parsed = parseFloat(amount);
        if (isNaN(parsed) || parsed <= 0) {
          res.status(400).json({ success: false, error: "Amount must be a positive decimal" });
          return;
        }
        updates.amount = parsed;
      }
      if (categoryId !== undefined) updates.categoryId = categoryId ? parseInt(categoryId, 10) : null;
      if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
      if (date !== undefined) updates.date = date;
      if (notes !== undefined) updates.notes = notes;
      if (receiptUrl !== undefined) updates.receiptUrl = receiptUrl;
      if (receiptScreenshot !== undefined) updates.receiptScreenshot = receiptScreenshot;

      const expenseId = parseInt(id, 10);
      const updated = await ExpenseRepository.update(expenseId, userId, updates);

      if (!updated) {
        res.status(404).json({ success: false, error: "Expense not found or unauthorized to update" });
        return;
      }

      // Audit Log
      await ActivityLogRepository.log(
        userId,
        "EXPENSE_UPDATED",
        `Updated expense details for transaction ID ${expenseId}`
      );

      // Trigger Budget Check
      const activeDate = date || updated.date;
      await BudgetAlertService.checkBudgets(userId, activeDate);

      res.status(200).json({
        success: true,
        message: "Expense updated successfully",
        data: updated,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to update expense",
      });
    }
  }

  static async softDelete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId || !id) {
        res.status(400).json({ success: false, error: "Missing parameters" });
        return;
      }

      const expenseId = parseInt(id, 10);
      const success = await ExpenseRepository.softDelete(expenseId, userId);

      if (!success) {
        res.status(404).json({ success: false, error: "Expense not found or unauthorized" });
        return;
      }

      await ActivityLogRepository.log(userId, "EXPENSE_SOFT_DELETED", `Soft-deleted expense ID ${expenseId}`);

      res.status(200).json({
        success: true,
        message: "Expense soft-deleted successfully",
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Soft deletion failed",
      });
    }
  }

  static async restore(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId || !id) {
        res.status(400).json({ success: false, error: "Missing parameters" });
        return;
      }

      const expenseId = parseInt(id, 10);
      const success = await ExpenseRepository.restore(expenseId, userId);

      if (!success) {
        res.status(404).json({ success: false, error: "Expense not found or unauthorized" });
        return;
      }

      await ActivityLogRepository.log(userId, "EXPENSE_RESTORED", `Restored soft-deleted expense ID ${expenseId}`);

      res.status(200).json({
        success: true,
        message: "Expense record restored successfully",
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Restoration failed",
      });
    }
  }

  static async hardDelete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId || !id) {
        res.status(400).json({ success: false, error: "Missing parameters" });
        return;
      }

      const expenseId = parseInt(id, 10);
      const success = await ExpenseRepository.hardDelete(expenseId, userId);

      if (!success) {
        res.status(404).json({ success: false, error: "Expense not found or unauthorized" });
        return;
      }

      await ActivityLogRepository.log(userId, "EXPENSE_HARD_DELETED", `Permanently hard-deleted expense ID ${expenseId}`);

      res.status(200).json({
        success: true,
        message: "Expense permanently removed",
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Hard deletion failed",
      });
    }
  }
}

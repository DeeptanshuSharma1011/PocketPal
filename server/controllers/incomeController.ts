import { Response } from "express";
import { IncomeRepository, IncomeQueryParams } from "../repositories/incomeRepository.js";
import { ActivityLogRepository } from "../repositories/activityLogRepository.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";

export class IncomeController {
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized access" });
        return;
      }

      const { limit, offset, sortBy, sortOrder, startDate, endDate, categoryId, search, includeDeleted } = req.query;

      const queryParams: IncomeQueryParams = {
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        sortBy: sortBy as "date" | "amount" | "created_at" | undefined,
        sortOrder: sortOrder as "ASC" | "DESC" | undefined,
        startDate: startDate as string,
        endDate: endDate as string,
        categoryId: categoryId ? parseInt(categoryId as string, 10) : undefined,
        search: search as string,
        includeDeleted: includeDeleted === "true",
      };

      const result = await IncomeRepository.findAll(userId, queryParams);

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
        error: err.message || "Failed to retrieve income history",
      });
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId || !id) {
        res.status(400).json({ success: false, error: "Missing required references" });
        return;
      }

      const income = await IncomeRepository.findById(parseInt(id, 10), userId);
      if (!income) {
        res.status(404).json({ success: false, error: "Income record not found" });
        return;
      }

      res.status(200).json({
        success: true,
        data: income,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Failed to retrieve income record",
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

      const { source, amount, categoryId, date, notes, receiptUrl, receiptScreenshot } = req.body;

      if (!source || !amount || !date) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: source, amount, date",
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

      const income = await IncomeRepository.create(userId, {
        source,
        amount: numericAmount,
        categoryId: categoryId ? parseInt(categoryId, 10) : null,
        date,
        notes,
        receiptUrl,
        receiptScreenshot,
      });

      // Audit Log
      await ActivityLogRepository.log(
        userId,
        "INCOME_CREATED",
        `Recorded income source "${source}" of ${numericAmount}`
      );

      res.status(201).json({
        success: true,
        message: "Income record added successfully",
        data: income,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to add income record",
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

      const { source, amount, categoryId, date, notes, receiptUrl, receiptScreenshot } = req.body;

      const updates: any = {};
      if (source !== undefined) updates.source = source;
      if (amount !== undefined) {
        const parsed = parseFloat(amount);
        if (isNaN(parsed) || parsed <= 0) {
          res.status(400).json({ success: false, error: "Amount must be a positive decimal number" });
          return;
        }
        updates.amount = parsed;
      }
      if (categoryId !== undefined) updates.categoryId = categoryId ? parseInt(categoryId, 10) : null;
      if (date !== undefined) updates.date = date;
      if (notes !== undefined) updates.notes = notes;
      if (receiptUrl !== undefined) updates.receiptUrl = receiptUrl;
      if (receiptScreenshot !== undefined) updates.receiptScreenshot = receiptScreenshot;

      const incomeId = parseInt(id, 10);
      const updated = await IncomeRepository.update(incomeId, userId, updates);

      if (!updated) {
        res.status(404).json({ success: false, error: "Income not found or unauthorized to edit" });
        return;
      }

      await ActivityLogRepository.log(userId, "INCOME_UPDATED", `Updated income details for ID ${incomeId}`);

      res.status(200).json({
        success: true,
        message: "Income updated successfully",
        data: updated,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to update income record",
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

      const incomeId = parseInt(id, 10);
      const success = await IncomeRepository.softDelete(incomeId, userId);

      if (!success) {
        res.status(404).json({ success: false, error: "Income not found or unauthorized" });
        return;
      }

      await ActivityLogRepository.log(userId, "INCOME_SOFT_DELETED", `Soft-deleted income ID ${incomeId}`);

      res.status(200).json({
        success: true,
        message: "Income record soft-deleted",
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

      const incomeId = parseInt(id, 10);
      const success = await IncomeRepository.restore(incomeId, userId);

      if (!success) {
        res.status(404).json({ success: false, error: "Income not found or unauthorized" });
        return;
      }

      await ActivityLogRepository.log(userId, "INCOME_RESTORED", `Restored soft-deleted income ID ${incomeId}`);

      res.status(200).json({
        success: true,
        message: "Income record restored successfully",
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

      const incomeId = parseInt(id, 10);
      const success = await IncomeRepository.hardDelete(incomeId, userId);

      if (!success) {
        res.status(404).json({ success: false, error: "Income not found or unauthorized" });
        return;
      }

      await ActivityLogRepository.log(userId, "INCOME_HARD_DELETED", `Permanently deleted income ID ${incomeId}`);

      res.status(200).json({
        success: true,
        message: "Income record permanently deleted",
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Hard deletion failed",
      });
    }
  }
}

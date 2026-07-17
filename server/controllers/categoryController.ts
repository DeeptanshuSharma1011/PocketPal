import { Response } from "express";
import { CategoryRepository } from "../repositories/categoryRepository.js";
import { ActivityLogRepository } from "../repositories/activityLogRepository.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";

export class CategoryController {
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized access" });
        return;
      }

      const categories = await CategoryRepository.findAllByUserId(userId);

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Failed to retrieve categories",
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

      const { name, type, icon, color } = req.body;

      if (!name || !type || !icon || !color) {
        res.status(400).json({
          success: false,
          error: "Missing fields. Required: name, type ('income'|'expense'), icon, color",
        });
        return;
      }

      if (type !== "income" && type !== "expense") {
        res.status(400).json({
          success: false,
          error: "Category type must be either 'income' or 'expense'",
        });
        return;
      }

      // Check if duplicate name for user
      const existingList = await CategoryRepository.findAllByUserId(userId);
      const duplicate = existingList.find(
        (c) => c.name.toLowerCase() === name.trim().toLowerCase() && c.type === type
      );

      if (duplicate) {
        res.status(400).json({
          success: false,
          error: `A category named "${name}" already exists for type "${type}"`,
        });
        return;
      }

      const category = await CategoryRepository.create(userId, name.trim(), type, icon, color);

      await ActivityLogRepository.log(userId, "CATEGORY_CREATED", `Created custom category "${name}"`);

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to create category",
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

      const { name, icon, color } = req.body;
      const catId = parseInt(id, 10);

      // Verify category belongs to user and is not default
      const cat = await CategoryRepository.findById(catId);
      if (!cat) {
        res.status(404).json({ success: false, error: "Category not found" });
        return;
      }

      if (cat.user_id !== userId) {
        res.status(403).json({
          success: false,
          error: "Unauthorized. Global default categories cannot be modified.",
        });
        return;
      }

      const updated = await CategoryRepository.update(catId, userId, { name, icon, color });

      await ActivityLogRepository.log(userId, "CATEGORY_UPDATED", `Updated custom category ID ${catId}`);

      res.status(200).json({
        success: true,
        message: "Category updated successfully",
        data: updated,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to update category",
      });
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId || !id) {
        res.status(400).json({ success: false, error: "Missing parameters" });
        return;
      }

      const catId = parseInt(id, 10);
      const cat = await CategoryRepository.findById(catId);
      if (!cat) {
        res.status(404).json({ success: false, error: "Category not found" });
        return;
      }

      if (cat.user_id !== userId) {
        res.status(403).json({
          success: false,
          error: "Unauthorized. Global default categories cannot be deleted.",
        });
        return;
      }

      await CategoryRepository.delete(catId, userId);

      await ActivityLogRepository.log(userId, "CATEGORY_DELETED", `Deleted custom category "${cat.name}"`);

      res.status(200).json({
        success: true,
        message: "Category deleted successfully. All associated transactions have been moved to 'Uncategorized'.",
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to delete category",
      });
    }
  }
}

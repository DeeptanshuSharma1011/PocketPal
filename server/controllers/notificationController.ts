import { Response } from "express";
import { NotificationRepository } from "../repositories/notificationRepository.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";

export class NotificationController {
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized access" });
        return;
      }

      const list = await NotificationRepository.findAll(userId);

      res.status(200).json({
        success: true,
        data: list,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Failed to retrieve notifications",
      });
    }
  }

  static async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId || !id) {
        res.status(400).json({ success: false, error: "Missing required references" });
        return;
      }

      const notifId = parseInt(id, 10);
      const success = await NotificationRepository.markAsRead(notifId, userId);

      if (!success) {
        res.status(404).json({ success: false, error: "Notification not found or unauthorized" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Notification marked as read",
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to mark notification as read",
      });
    }
  }

  static async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      await NotificationRepository.markAllAsRead(userId);

      res.status(200).json({
        success: true,
        message: "All notification banners marked as read",
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to clear alerts",
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

      const notifId = parseInt(id, 10);
      const success = await NotificationRepository.delete(notifId, userId);

      if (!success) {
        res.status(404).json({ success: false, error: "Notification not found or unauthorized" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Notification dismissed",
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Failed to dismiss notification",
      });
    }
  }
}

import { Response } from "express";
import { AuthService } from "../services/authService.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { checkDatabaseConnection } from "../config/db.js";

export class AuthController {
  static async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: email, password, name",
        });
        return;
      }

      const ip = req.ip || req.socket.remoteAddress;
      const data = await AuthService.register(email, password, name, ip);

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Registration failed",
      });
    }
  }

  static async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: "Missing email or password",
        });
        return;
      }

      const ip = req.ip || req.socket.remoteAddress;
      const data = await AuthService.login(email, password, ip);

      res.status(200).json({
        success: true,
        message: "Login successful",
        data,
      });
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: err.message || "Authentication failed",
      });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const userId = req.user?.userId;

      if (!refreshToken || !userId) {
        res.status(400).json({
          success: false,
          error: "Missing refresh token or session user reference",
        });
        return;
      }

      const ip = req.ip || req.socket.remoteAddress;
      await AuthService.logout(refreshToken, userId, ip);

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Logout failed",
      });
    }
  }

  static async refresh(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: "Missing refresh token",
        });
        return;
      }

      const data = await AuthService.refresh(refreshToken);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: err.message || "Token refresh failed",
      });
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.userId;

      if (!currentPassword || !newPassword || !userId) {
        res.status(400).json({
          success: false,
          error: "Missing current or new password parameters",
        });
        return;
      }

      const ip = req.ip || req.socket.remoteAddress;
      await AuthService.changePassword(userId, currentPassword, newPassword, ip);

      res.status(200).json({
        success: true,
        message: "Password credentials updated successfully",
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || "Password change failed",
      });
    }
  }

  static async checkStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const dbStatus = await checkDatabaseConnection();
      res.status(200).json({
        success: true,
        status: "success",
        database: dbStatus,
        user: req.user || null,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Status check failed",
      });
    }
  }
}

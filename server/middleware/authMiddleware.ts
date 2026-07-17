import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    name: string;
  };
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Access token is missing. Please authenticate.",
      },
    });
    return;
  }

  try {
    const payload = await AuthService.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED_INVALID",
        message: err.message || "Invalid or expired access token.",
      },
    });
  }
}

export async function optionalAuthenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token || token === "null" || token === "undefined") {
    next();
    return;
  }

  try {
    const payload = await AuthService.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    // Treat invalid or expired token as optional and proceed
    next();
  }
}

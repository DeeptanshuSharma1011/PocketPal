import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UserRepository } from "../repositories/userRepository.js";
import { RefreshTokenRepository } from "../repositories/refreshTokenRepository.js";
import { ActivityLogRepository } from "../repositories/activityLogRepository.js";
import { NotificationRepository } from "../repositories/notificationRepository.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-jwt-development-only-pocketpal";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret-pocketpal";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export interface TokenPayload {
  userId: number;
  email: string;
  name: string;
}

export class AuthService {
  static async register(email: string, passwordPlain: string, name: string, ipAddress?: string): Promise<any> {
    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      throw new Error("Email address is already registered");
    }

    // Secure password hashing
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(passwordPlain, salt);

    // Save user
    const user = await UserRepository.create(email, hash, name);

    // Audit Log & Notification
    await ActivityLogRepository.log(user.id, "REGISTER", "Successfully registered account", ipAddress);
    await NotificationRepository.create(user.id, {
      title: "Welcome to PocketPal!",
      message: `Hi ${name}, thank you for choosing PocketPal. Start by setting your monthly income in your profile.`,
      type: "success",
    });

    // Generate tokens
    const tokens = await this.generateTokenPair(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        monthly_income: user.monthly_income,
        currency: user.currency,
        profile_picture: user.profile_picture,
      },
      ...tokens,
    };
  }

  static async login(email: string, passwordPlain: string, ipAddress?: string): Promise<any> {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const matches = await bcrypt.compare(passwordPlain, user.password_hash);
    if (!matches) {
      throw new Error("Invalid email or password");
    }

    // Log Activity
    await ActivityLogRepository.log(user.id, "LOGIN", "Successfully logged into dashboard", ipAddress);

    // Generate tokens
    const tokens = await this.generateTokenPair(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        monthly_income: user.monthly_income,
        currency: user.currency,
        profile_picture: user.profile_picture,
      },
      ...tokens,
    };
  }

  static async logout(refreshToken: string, userId: number, ipAddress?: string): Promise<void> {
    await RefreshTokenRepository.deleteByToken(refreshToken);
    await ActivityLogRepository.log(userId, "LOGOUT", "Successfully logged out of application", ipAddress);
  }

  static async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const stored = await RefreshTokenRepository.findByToken(refreshToken);
    if (!stored) {
      throw new Error("Invalid or revoked refresh token");
    }

    if (new Date(stored.expires_at) < new Date()) {
      await RefreshTokenRepository.deleteByToken(refreshToken);
      throw new Error("Refresh token has expired. Please login again.");
    }

    const user = await UserRepository.findById(stored.user_id);
    if (!user) {
      throw new Error("User account no longer exists");
    }

    // Verify token cryptographically
    try {
      jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (err) {
      throw new Error("Invalid refresh token signature");
    }

    // Generate new short-lived access token
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });

    return { accessToken };
  }

  static async changePassword(userId: number, currentPlain: string, newPlain: string, ipAddress?: string): Promise<void> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const matches = await bcrypt.compare(currentPlain, user.password_hash);
    if (!matches) {
      throw new Error("Current password is incorrect");
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPlain, salt);

    await UserRepository.updatePassword(userId, hash);
    await ActivityLogRepository.log(userId, "CHANGE_PASSWORD", "Successfully updated password credentials", ipAddress);
    await NotificationRepository.create(userId, {
      title: "Credentials Updated",
      message: "Your login password has been changed successfully.",
      type: "success",
    });
  }

  // Generate short-lived Access Token and secure Refresh Token
  private static async generateTokenPair(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN as any });

    // Save refresh token to database
    const days = parseInt(JWT_REFRESH_EXPIRES_IN.replace("d", ""), 10) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    // Remove old refresh tokens to clean up database space
    await RefreshTokenRepository.deleteByUserId(user.id);
    await RefreshTokenRepository.create(user.id, refreshToken, expiresAt);

    return { accessToken, refreshToken };
  }

  static async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (err) {
      let supabaseUrl = process.env.VITE_SUPABASE_URL || "";
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

      // Clean the Supabase URL in case it has /rest/v1 suffix or trailing slashes
      if (supabaseUrl.includes("/rest/v1")) {
        supabaseUrl = supabaseUrl.replace("/rest/v1", "");
      }
      if (supabaseUrl.endsWith("/")) {
        supabaseUrl = supabaseUrl.slice(0, -1);
      }

      const isPlaceholderUrl = !supabaseUrl || supabaseUrl.includes("placeholder-project") || supabaseUrl.includes("your-supabase-project");
      const isPlaceholderKey = !supabaseAnonKey || supabaseAnonKey.includes("your-anon-public-key") || supabaseAnonKey.includes("placeholder-key");

      if (isPlaceholderUrl || isPlaceholderKey) {
        try {
          const decoded = jwt.decode(token) as any;
          if (decoded && (decoded.email || decoded.sub)) {
            const email = decoded.email || `${decoded.sub}@placeholder.com`;
            const name = decoded.user_metadata?.name || decoded.email?.split("@")[0] || "User";

            const user = await UserRepository.findByEmail(email);
            if (user) {
              return { userId: user.id, email: user.email, name: user.name };
            } else {
              const newUser = await UserRepository.create(email, "", name);
              return { userId: newUser.id, email: newUser.email, name: newUser.name };
            }
          }
        } catch (decodeErr) {
          // ignore decoding errors
        }
        throw new Error("Invalid or expired access token");
      }

      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "apikey": supabaseAnonKey
          }
        });

        if (response.status === 200) {
          const suUser = (await response.json()) as any;
          const email = suUser.email || "";
          const name = suUser.user_metadata?.name || email.split("@")[0] || "User";

          let user = await UserRepository.findByEmail(email);
          if (!user) {
            user = await UserRepository.create(email, "", name);
          }

          return {
            userId: user.id,
            email: user.email,
            name: user.name
          };
        }
      } catch (fetchErr) {
        console.error("Error verifying token with Supabase:", fetchErr);
      }

      throw new Error("Invalid or expired access token");
    }
  }
}

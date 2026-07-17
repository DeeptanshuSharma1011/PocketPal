import { getDbPool, isDatabaseMocked } from "../config/db.js";
import mockDb, { RefreshTokenRow } from "./mockDb.js";

export class RefreshTokenRepository {
  static async create(userId: number, token: string, expiresAt: Date): Promise<RefreshTokenRow> {
    if (isDatabaseMocked()) {
      const newRow: RefreshTokenRow = {
        id: mockDb.getRefreshTokenId(),
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      };
      mockDb.refreshTokens.push(newRow);
      return newRow;
    }

    const pool = getDbPool();
    const query = `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, token, expires_at, created_at
    `;
    const res = await pool.query(query, [userId, token, expiresAt]);
    return res.rows[0];
  }

  static async findByToken(token: string): Promise<RefreshTokenRow | null> {
    if (isDatabaseMocked()) {
      const row = mockDb.refreshTokens.find((rt) => rt.token === token);
      return row ? { ...row } : null;
    }

    const pool = getDbPool();
    const query = `
      SELECT id, user_id, token, expires_at, created_at
      FROM refresh_tokens
      WHERE token = $1
    `;
    const res = await pool.query(query, [token]);
    return res.rows[0] || null;
  }

  static async deleteByToken(token: string): Promise<boolean> {
    if (isDatabaseMocked()) {
      const idx = mockDb.refreshTokens.findIndex((rt) => rt.token === token);
      if (idx === -1) return false;
      mockDb.refreshTokens.splice(idx, 1);
      return true;
    }

    const pool = getDbPool();
    const query = `
      DELETE FROM refresh_tokens
      WHERE token = $1
    `;
    const res = await pool.query(query, [token]);
    return (res.rowCount ?? 0) > 0;
  }

  static async deleteByUserId(userId: number): Promise<void> {
    if (isDatabaseMocked()) {
      mockDb.refreshTokens = mockDb.refreshTokens.filter((rt) => rt.user_id !== userId);
      return;
    }

    const pool = getDbPool();
    const query = `
      DELETE FROM refresh_tokens
      WHERE user_id = $1
    `;
    await pool.query(query, [userId]);
  }
}

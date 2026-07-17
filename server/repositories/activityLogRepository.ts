import { getDbPool, isDatabaseMocked } from "../config/db.js";
import mockDb, { ActivityLogRow } from "./mockDb.js";

export class ActivityLogRepository {
  static async findAll(userId: number): Promise<ActivityLogRow[]> {
    if (isDatabaseMocked()) {
      return mockDb.activityLogs
        .filter((log) => log.user_id === userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    const pool = getDbPool();
    const query = `
      SELECT id, user_id, action, details, ip_address, created_at
      FROM activity_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `;
    const res = await pool.query(query, [userId]);
    return res.rows;
  }

  static async log(userId: number, action: string, details?: string, ipAddress?: string): Promise<ActivityLogRow> {
    const ip = ipAddress || "127.0.0.1";

    if (isDatabaseMocked()) {
      const newRow: ActivityLogRow = {
        id: mockDb.getActivityLogId(),
        user_id: userId,
        action,
        details: details || null,
        ip_address: ip,
        created_at: new Date().toISOString(),
      };
      mockDb.activityLogs.push(newRow);
      return { ...newRow };
    }

    const pool = getDbPool();
    const query = `
      INSERT INTO activity_logs (user_id, action, details, ip_address)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, action, details, ip_address, created_at
    `;
    const res = await pool.query(query, [userId, action, details || null, ip]);
    return res.rows[0];
  }
}

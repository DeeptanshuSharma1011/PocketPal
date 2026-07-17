import { getDbPool, isDatabaseMocked } from "../config/db.js";
import mockDb, { NotificationRow } from "./mockDb.js";

export class NotificationRepository {
  static async findAll(userId: number): Promise<NotificationRow[]> {
    if (isDatabaseMocked()) {
      return mockDb.notifications
        .filter((n) => n.user_id === userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    const pool = getDbPool();
    const query = `
      SELECT id, user_id, title, message, type, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const res = await pool.query(query, [userId]);
    return res.rows;
  }

  static async create(
    userId: number,
    data: { title: string; message: string; type?: "info" | "warning" | "success" }
  ): Promise<NotificationRow> {
    if (isDatabaseMocked()) {
      const newRow: NotificationRow = {
        id: mockDb.getNotificationId(),
        user_id: userId,
        title: data.title,
        message: data.message,
        type: data.type || "info",
        is_read: false,
        created_at: new Date().toISOString(),
      };
      mockDb.notifications.push(newRow);
      return { ...newRow };
    }

    const pool = getDbPool();
    const query = `
      INSERT INTO notifications (user_id, title, message, type, is_read)
      VALUES ($1, $2, $3, $4, FALSE)
      RETURNING id, user_id, title, message, type, is_read, created_at
    `;
    const res = await pool.query(query, [userId, data.title, data.message, data.type || "info"]);
    return res.rows[0];
  }

  static async markAsRead(id: number, userId: number): Promise<boolean> {
    if (isDatabaseMocked()) {
      const n = mockDb.notifications.find((notif) => notif.id === id && notif.user_id === userId);
      if (!n) return false;
      n.is_read = true;
      return true;
    }

    const pool = getDbPool();
    const query = `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
    `;
    const res = await pool.query(query, [id, userId]);
    return (res.rowCount ?? 0) > 0;
  }

  static async markAllAsRead(userId: number): Promise<void> {
    if (isDatabaseMocked()) {
      mockDb.notifications.forEach((n) => {
        if (n.user_id === userId) n.is_read = true;
      });
      return;
    }

    const pool = getDbPool();
    const query = `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1
    `;
    await pool.query(query, [userId]);
  }

  static async delete(id: number, userId: number): Promise<boolean> {
    if (isDatabaseMocked()) {
      const idx = mockDb.notifications.findIndex((n) => n.id === id && n.user_id === userId);
      if (idx === -1) return false;
      mockDb.notifications.splice(idx, 1);
      return true;
    }

    const pool = getDbPool();
    const query = `
      DELETE FROM notifications
      WHERE id = $1 AND user_id = $2
    `;
    const res = await pool.query(query, [id, userId]);
    return (res.rowCount ?? 0) > 0;
  }
}

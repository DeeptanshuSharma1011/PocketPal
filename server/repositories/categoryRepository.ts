import { getDbPool, isDatabaseMocked } from "../config/db.js";
import mockDb, { CategoryRow } from "./mockDb.js";

export class CategoryRepository {
  static async findAllByUserId(userId: number): Promise<CategoryRow[]> {
    if (isDatabaseMocked()) {
      return mockDb.categories.filter((cat) => cat.user_id === null || cat.user_id === userId);
    }

    const pool = getDbPool();
    const query = `
      SELECT id, user_id, name, type, icon, color, is_default, created_at
      FROM categories
      WHERE user_id IS NULL OR user_id = $1
      ORDER BY is_default DESC, name ASC
    `;
    const res = await pool.query(query, [userId]);
    return res.rows;
  }

  static async findById(id: number): Promise<CategoryRow | null> {
    if (isDatabaseMocked()) {
      const cat = mockDb.categories.find((c) => c.id === id);
      return cat ? { ...cat } : null;
    }

    const pool = getDbPool();
    const query = `
      SELECT id, user_id, name, type, icon, color, is_default, created_at
      FROM categories
      WHERE id = $1
    `;
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }

  static async create(
    userId: number,
    name: string,
    type: "income" | "expense",
    icon: string,
    color: string
  ): Promise<CategoryRow> {
    if (isDatabaseMocked()) {
      const newCat: CategoryRow = {
        id: mockDb.getCategoryId(),
        user_id: userId,
        name,
        type,
        icon,
        color,
        is_default: false,
        created_at: new Date().toISOString(),
      };
      mockDb.categories.push(newCat);
      return { ...newCat };
    }

    const pool = getDbPool();
    const query = `
      INSERT INTO categories (user_id, name, type, icon, color, is_default)
      VALUES ($1, $2, $3, $4, $5, FALSE)
      RETURNING id, user_id, name, type, icon, color, is_default, created_at
    `;
    const res = await pool.query(query, [userId, name, type, icon, color]);
    return res.rows[0];
  }

  static async update(
    id: number,
    userId: number,
    fields: { name?: string; icon?: string; color?: string }
  ): Promise<CategoryRow | null> {
    if (isDatabaseMocked()) {
      const idx = mockDb.categories.findIndex((cat) => cat.id === id && cat.user_id === userId);
      if (idx === -1) return null;

      const cat = mockDb.categories[idx];
      if (fields.name !== undefined) cat.name = fields.name;
      if (fields.icon !== undefined) cat.icon = fields.icon;
      if (fields.color !== undefined) cat.color = fields.color;

      return { ...cat };
    }

    const pool = getDbPool();
    const updates: string[] = [];
    const values: any[] = [];
    let valIdx = 1;

    if (fields.name !== undefined) {
      updates.push(`name = $${valIdx++}`);
      values.push(fields.name);
    }
    if (fields.icon !== undefined) {
      updates.push(`icon = $${valIdx++}`);
      values.push(fields.icon);
    }
    if (fields.color !== undefined) {
      updates.push(`color = $${valIdx++}`);
      values.push(fields.color);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const idIdx = valIdx++;
    values.push(userId);
    const userIdx = valIdx++;

    const query = `
      UPDATE categories
      SET ${updates.join(", ")}
      WHERE id = $${idIdx} AND user_id = $${userIdx}
      RETURNING id, user_id, name, type, icon, color, is_default, created_at
    `;
    const res = await pool.query(query, values);
    return res.rows[0] || null;
  }

  static async delete(id: number, userId: number): Promise<boolean> {
    if (isDatabaseMocked()) {
      const idx = mockDb.categories.findIndex((cat) => cat.id === id && cat.user_id === userId);
      if (idx === -1) return false;
      mockDb.categories.splice(idx, 1);

      // Nullify references in Expenses and Income rows (mock relation cascade behavior)
      mockDb.expenses.forEach((e) => {
        if (e.category_id === id) e.category_id = null;
      });
      mockDb.income.forEach((i) => {
        if (i.category_id === id) i.category_id = null;
      });
      mockDb.budgets.forEach((b) => {
        if (b.category_id === id) b.category_id = null;
      });
      mockDb.recurringTransactions.forEach((r) => {
        if (r.category_id === id) r.category_id = null;
      });

      return true;
    }

    const pool = getDbPool();
    const query = `
      DELETE FROM categories
      WHERE id = $1 AND user_id = $2
    `;
    const res = await pool.query(query, [id, userId]);
    return (res.rowCount ?? 0) > 0;
  }
}

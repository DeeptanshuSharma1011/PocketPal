import { getDbPool, isDatabaseMocked } from "../config/db.js";
import mockDb, { RecurringTransactionRow } from "./mockDb.js";

export class RecurringTransactionRepository {
  static async findAll(userId: number): Promise<any[]> {
    if (isDatabaseMocked()) {
      const list = mockDb.recurringTransactions.filter((r) => r.user_id === userId);
      return list.map((r) => {
        const cat = mockDb.categories.find((c) => c.id === r.category_id);
        return {
          ...r,
          category_name: cat ? cat.name : "Uncategorized",
          category_color: cat ? cat.color : "#6B7280",
          category_icon: cat ? cat.icon : "Coins",
        };
      });
    }

    const pool = getDbPool();
    const query = `
      SELECT 
        r.id, r.user_id, r.type, r.title_or_source, r.amount::FLOAT as amount, 
        r.category_id, r.frequency, r.next_execution_date::VARCHAR as next_execution_date, 
        r.is_active, r.notes, r.created_at, r.updated_at,
        c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM recurring_transactions r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = $1
      ORDER BY r.next_execution_date ASC
    `;
    const res = await pool.query(query, [userId]);
    return res.rows;
  }

  static async findById(id: number, userId: number): Promise<any | null> {
    if (isDatabaseMocked()) {
      const r = mockDb.recurringTransactions.find((rec) => rec.id === id && rec.user_id === userId);
      if (!r) return null;
      const cat = mockDb.categories.find((c) => c.id === r.category_id);
      return {
        ...r,
        category_name: cat ? cat.name : "Uncategorized",
        category_color: cat ? cat.color : "#6B7280",
        category_icon: cat ? cat.icon : "Coins",
      };
    }

    const pool = getDbPool();
    const query = `
      SELECT 
        r.id, r.user_id, r.type, r.title_or_source, r.amount::FLOAT as amount, 
        r.category_id, r.frequency, r.next_execution_date::VARCHAR as next_execution_date, 
        r.is_active, r.notes, r.created_at, r.updated_at,
        c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM recurring_transactions r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.id = $1 AND r.user_id = $2
    `;
    const res = await pool.query(query, [id, userId]);
    return res.rows[0] || null;
  }

  static async create(
    userId: number,
    data: {
      type: "income" | "expense";
      titleOrSource: string;
      amount: number;
      categoryId: number | null;
      frequency: "daily" | "weekly" | "monthly" | "yearly";
      nextExecutionDate: string;
      notes?: string;
    }
  ): Promise<RecurringTransactionRow> {
    if (isDatabaseMocked()) {
      const newRow: RecurringTransactionRow = {
        id: mockDb.getRecurringId(),
        user_id: userId,
        type: data.type,
        title_or_source: data.titleOrSource,
        amount: data.amount,
        category_id: data.categoryId,
        frequency: data.frequency || "monthly",
        next_execution_date: data.nextExecutionDate,
        is_active: true,
        notes: data.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockDb.recurringTransactions.push(newRow);
      return { ...newRow };
    }

    const pool = getDbPool();
    const query = `
      INSERT INTO recurring_transactions (user_id, type, title_or_source, amount, category_id, frequency, next_execution_date, is_active, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)
      RETURNING id, user_id, type, title_or_source, amount::FLOAT as amount, category_id, frequency, next_execution_date::VARCHAR as next_execution_date, is_active, notes, created_at, updated_at
    `;
    const res = await pool.query(query, [
      userId,
      data.type,
      data.titleOrSource,
      data.amount,
      data.categoryId,
      data.frequency,
      data.nextExecutionDate,
      data.notes || null,
    ]);
    return res.rows[0];
  }

  static async update(
    id: number,
    userId: number,
    data: {
      titleOrSource?: string;
      amount?: number;
      categoryId?: number | null;
      frequency?: "daily" | "weekly" | "monthly" | "yearly";
      nextExecutionDate?: string;
      isActive?: boolean;
      notes?: string;
    }
  ): Promise<RecurringTransactionRow | null> {
    if (isDatabaseMocked()) {
      const idx = mockDb.recurringTransactions.findIndex((rec) => rec.id === id && rec.user_id === userId);
      if (idx === -1) return null;

      const r = mockDb.recurringTransactions[idx];
      if (data.titleOrSource !== undefined) r.title_or_source = data.titleOrSource;
      if (data.amount !== undefined) r.amount = data.amount;
      if (data.categoryId !== undefined) r.category_id = data.categoryId;
      if (data.frequency !== undefined) r.frequency = data.frequency;
      if (data.nextExecutionDate !== undefined) r.next_execution_date = data.nextExecutionDate;
      if (data.isActive !== undefined) r.is_active = data.isActive;
      if (data.notes !== undefined) r.notes = data.notes;
      r.updated_at = new Date().toISOString();

      return { ...r };
    }

    const pool = getDbPool();
    const updates: string[] = [];
    const values: any[] = [];
    let valIdx = 1;

    if (data.titleOrSource !== undefined) {
      updates.push(`title_or_source = $${valIdx++}`);
      values.push(data.titleOrSource);
    }
    if (data.amount !== undefined) {
      updates.push(`amount = $${valIdx++}`);
      values.push(data.amount);
    }
    if (data.categoryId !== undefined) {
      updates.push(`category_id = $${valIdx++}`);
      values.push(data.categoryId);
    }
    if (data.frequency !== undefined) {
      updates.push(`frequency = $${valIdx++}`);
      values.push(data.frequency);
    }
    if (data.nextExecutionDate !== undefined) {
      updates.push(`next_execution_date = $${valIdx++}`);
      values.push(data.nextExecutionDate);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${valIdx++}`);
      values.push(data.isActive);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${valIdx++}`);
      values.push(data.notes);
    }

    if (updates.length === 0) {
      return this.findById(id, userId);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    const idIdx = valIdx++;
    values.push(userId);
    const userIdx = valIdx++;

    const query = `
      UPDATE recurring_transactions
      SET ${updates.join(", ")}
      WHERE id = $${idIdx} AND user_id = $${userIdx}
      RETURNING id, user_id, type, title_or_source, amount::FLOAT as amount, category_id, frequency, next_execution_date::VARCHAR as next_execution_date, is_active, notes, created_at, updated_at
    `;
    const res = await pool.query(query, values);
    return res.rows[0] || null;
  }

  static async delete(id: number, userId: number): Promise<boolean> {
    if (isDatabaseMocked()) {
      const idx = mockDb.recurringTransactions.findIndex((rec) => rec.id === id && rec.user_id === userId);
      if (idx === -1) return false;
      mockDb.recurringTransactions.splice(idx, 1);
      return true;
    }

    const pool = getDbPool();
    const query = `
      DELETE FROM recurring_transactions
      WHERE id = $1 AND user_id = $2
    `;
    const res = await pool.query(query, [id, userId]);
    return (res.rowCount ?? 0) > 0;
  }

  // Fetch recurring transactions that are active and whose next execution date is due (today or in the past)
  static async findDueTransactions(): Promise<any[]> {
    const todayStr = new Date().toISOString().split("T")[0];

    if (isDatabaseMocked()) {
      return mockDb.recurringTransactions.filter((r) => r.is_active && r.next_execution_date <= todayStr);
    }

    const pool = getDbPool();
    const query = `
      SELECT id, user_id, type, title_or_source, amount::FLOAT as amount, category_id, frequency, next_execution_date::VARCHAR as next_execution_date, is_active, notes
      FROM recurring_transactions
      WHERE is_active = TRUE AND next_execution_date <= $1
    `;
    const res = await pool.query(query, [todayStr]);
    return res.rows;
  }
}

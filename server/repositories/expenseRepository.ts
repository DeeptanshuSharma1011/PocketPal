import { getDbPool, isDatabaseMocked } from "../config/db.js";
import mockDb, { ExpenseRow } from "./mockDb.js";

export interface ExpenseQueryParams {
  limit?: number;
  offset?: number;
  sortBy?: "date" | "amount" | "created_at";
  sortOrder?: "ASC" | "DESC";
  startDate?: string;
  endDate?: string;
  categoryId?: number;
  paymentMethod?: string;
  search?: string;
  includeDeleted?: boolean;
}

export class ExpenseRepository {
  static async findAll(userId: number, params: ExpenseQueryParams): Promise<{ rows: any[]; totalCount: number }> {
    const limit = params.limit || 10;
    const offset = params.offset || 0;
    const sortBy = params.sortBy || "date";
    const sortOrder = params.sortOrder || "DESC";
    const includeDeleted = params.includeDeleted || false;

    if (isDatabaseMocked()) {
      let list = mockDb.expenses.filter((e) => e.user_id === userId);

      if (!includeDeleted) {
        list = list.filter((e) => !e.is_soft_deleted);
      }

      if (params.categoryId) {
        list = list.filter((e) => e.category_id === params.categoryId);
      }

      if (params.paymentMethod) {
        list = list.filter((e) => e.payment_method.toLowerCase() === params.paymentMethod?.toLowerCase());
      }

      if (params.startDate) {
        list = list.filter((e) => e.date >= params.startDate!);
      }

      if (params.endDate) {
        list = list.filter((e) => e.date <= params.endDate!);
      }

      if (params.search) {
        const query = params.search.toLowerCase();
        list = list.filter(
          (e) =>
            e.title.toLowerCase().includes(query) ||
            (e.notes && e.notes.toLowerCase().includes(query))
        );
      }

      // Sorting
      list.sort((a: any, b: any) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (sortBy === "date" || sortBy === "created_at") {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }

        if (valA < valB) return sortOrder === "ASC" ? -1 : 1;
        if (valA > valB) return sortOrder === "ASC" ? 1 : -1;
        return 0;
      });

      const totalCount = list.length;
      const paginatedList = list.slice(offset, offset + limit);

      // Join Category names in memory
      const resultRows = paginatedList.map((e) => {
        const cat = mockDb.categories.find((c) => c.id === e.category_id);
        return {
          ...e,
          category_name: cat ? cat.name : "Uncategorized",
          category_color: cat ? cat.color : "#6B7280",
          category_icon: cat ? cat.icon : "Coins",
        };
      });

      return { rows: resultRows, totalCount };
    }

    const pool = getDbPool();
    const conditions: string[] = ["e.user_id = $1"];
    const values: any[] = [userId];
    let valIdx = 2;

    if (!includeDeleted) {
      conditions.push(`e.is_soft_deleted = FALSE`);
    }

    if (params.categoryId) {
      conditions.push(`e.category_id = $${valIdx++}`);
      values.push(params.categoryId);
    }

    if (params.paymentMethod) {
      conditions.push(`LOWER(e.payment_method) = LOWER($${valIdx++})`);
      values.push(params.paymentMethod);
    }

    if (params.startDate) {
      conditions.push(`e.date >= $${valIdx++}`);
      values.push(params.startDate);
    }

    if (params.endDate) {
      conditions.push(`e.date <= $${valIdx++}`);
      values.push(params.endDate);
    }

    if (params.search) {
      conditions.push(`(LOWER(e.title) LIKE LOWER($${valIdx}) OR LOWER(e.notes) LIKE LOWER($${valIdx}))`);
      values.push(`%${params.search}%`);
      valIdx++;
    }

    const whereClause = conditions.join(" AND ");

    // Get Total Count
    const countQuery = `SELECT COUNT(*)::INTEGER as count FROM expenses e WHERE ${whereClause}`;
    const countRes = await pool.query(countQuery, values);
    const totalCount = countRes.rows[0]?.count || 0;

    // Fetch Paginated Rows
    const orderCol = sortBy === "amount" ? "e.amount" : sortBy === "created_at" ? "e.created_at" : "e.date";
    const dataQuery = `
      SELECT 
        e.id, e.user_id, e.category_id, e.title, e.amount::FLOAT as amount, 
        e.payment_method, e.date::VARCHAR as date, e.notes, e.receipt_url, e.receipt_screenshot, e.is_soft_deleted, e.created_at, e.updated_at,
        c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE ${whereClause}
      ORDER BY ${orderCol} ${sortOrder === "ASC" ? "ASC" : "DESC"}
      LIMIT $${valIdx++} OFFSET $${valIdx++}
    `;

    const dataValues = [...values, limit, offset];
    const dataRes = await pool.query(dataQuery, dataValues);

    return { rows: dataRes.rows, totalCount };
  }

  static async findById(id: number, userId: number): Promise<any | null> {
    if (isDatabaseMocked()) {
      const e = mockDb.expenses.find((exp) => exp.id === id && exp.user_id === userId);
      if (!e) return null;
      const cat = mockDb.categories.find((c) => c.id === e.category_id);
      return {
        ...e,
        category_name: cat ? cat.name : "Uncategorized",
        category_color: cat ? cat.color : "#6B7280",
        category_icon: cat ? cat.icon : "Coins",
      };
    }

    const pool = getDbPool();
    const query = `
      SELECT 
        e.id, e.user_id, e.category_id, e.title, e.amount::FLOAT as amount, 
        e.payment_method, e.date::VARCHAR as date, e.notes, e.receipt_url, e.receipt_screenshot, e.is_soft_deleted, e.created_at, e.updated_at,
        c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = $1 AND e.user_id = $2
    `;
    const res = await pool.query(query, [id, userId]);
    return res.rows[0] || null;
  }

  static async create(
    userId: number,
    data: {
      title: string;
      amount: number;
      categoryId: number | null;
      paymentMethod: string;
      date: string;
      notes?: string;
      receiptUrl?: string;
      receiptScreenshot?: string;
    }
  ): Promise<ExpenseRow> {
    if (isDatabaseMocked()) {
      const newRow: ExpenseRow = {
        id: mockDb.getExpenseId(),
        user_id: userId,
        category_id: data.categoryId,
        title: data.title,
        amount: data.amount,
        payment_method: data.paymentMethod || "Cash",
        date: data.date,
        notes: data.notes || null,
        receipt_url: data.receiptUrl || null,
        receipt_screenshot: data.receiptScreenshot || null,
        is_soft_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockDb.expenses.push(newRow);
      return { ...newRow };
    }

    const pool = getDbPool();
    const query = `
      INSERT INTO expenses (user_id, category_id, title, amount, payment_method, date, notes, receipt_url, receipt_screenshot)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, user_id, category_id, title, amount::FLOAT as amount, payment_method, date::VARCHAR as date, notes, receipt_url, receipt_screenshot, is_soft_deleted, created_at, updated_at
    `;
    const res = await pool.query(query, [
      userId,
      data.categoryId,
      data.title,
      data.amount,
      data.paymentMethod,
      data.date,
      data.notes || null,
      data.receiptUrl || null,
      data.receiptScreenshot || null,
    ]);
    return res.rows[0];
  }

  static async update(
    id: number,
    userId: number,
    data: {
      title?: string;
      amount?: number;
      categoryId?: number | null;
      paymentMethod?: string;
      date?: string;
      notes?: string;
      receiptUrl?: string | null;
      receiptScreenshot?: string | null;
    }
  ): Promise<ExpenseRow | null> {
    if (isDatabaseMocked()) {
      const idx = mockDb.expenses.findIndex((exp) => exp.id === id && exp.user_id === userId);
      if (idx === -1) return null;

      const e = mockDb.expenses[idx];
      if (data.title !== undefined) e.title = data.title;
      if (data.amount !== undefined) e.amount = data.amount;
      if (data.categoryId !== undefined) e.category_id = data.categoryId;
      if (data.paymentMethod !== undefined) e.payment_method = data.paymentMethod;
      if (data.date !== undefined) e.date = data.date;
      if (data.notes !== undefined) e.notes = data.notes;
      if (data.receiptUrl !== undefined) e.receipt_url = data.receiptUrl;
      if (data.receiptScreenshot !== undefined) e.receipt_screenshot = data.receiptScreenshot;
      e.updated_at = new Date().toISOString();

      return { ...e };
    }

    const pool = getDbPool();
    const updates: string[] = [];
    const values: any[] = [];
    let valIdx = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${valIdx++}`);
      values.push(data.title);
    }
    if (data.amount !== undefined) {
      updates.push(`amount = $${valIdx++}`);
      values.push(data.amount);
    }
    if (data.categoryId !== undefined) {
      updates.push(`category_id = $${valIdx++}`);
      values.push(data.categoryId);
    }
    if (data.paymentMethod !== undefined) {
      updates.push(`payment_method = $${valIdx++}`);
      values.push(data.paymentMethod);
    }
    if (data.date !== undefined) {
      updates.push(`date = $${valIdx++}`);
      values.push(data.date);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${valIdx++}`);
      values.push(data.notes);
    }
    if (data.receiptUrl !== undefined) {
      updates.push(`receipt_url = $${valIdx++}`);
      values.push(data.receiptUrl);
    }
    if (data.receiptScreenshot !== undefined) {
      updates.push(`receipt_screenshot = $${valIdx++}`);
      values.push(data.receiptScreenshot);
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
      UPDATE expenses
      SET ${updates.join(", ")}
      WHERE id = $${idIdx} AND user_id = $${userIdx}
      RETURNING id, user_id, category_id, title, amount::FLOAT as amount, payment_method, date::VARCHAR as date, notes, receipt_url, receipt_screenshot, is_soft_deleted, created_at, updated_at
    `;
    const res = await pool.query(query, values);
    return res.rows[0] || null;
  }

  static async softDelete(id: number, userId: number): Promise<boolean> {
    if (isDatabaseMocked()) {
      const e = mockDb.expenses.find((exp) => exp.id === id && exp.user_id === userId);
      if (!e) return false;
      e.is_soft_deleted = true;
      e.updated_at = new Date().toISOString();
      return true;
    }

    const pool = getDbPool();
    const query = `
      UPDATE expenses
      SET is_soft_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
    `;
    const res = await pool.query(query, [id, userId]);
    return (res.rowCount ?? 0) > 0;
  }

  static async restore(id: number, userId: number): Promise<boolean> {
    if (isDatabaseMocked()) {
      const e = mockDb.expenses.find((exp) => exp.id === id && exp.user_id === userId);
      if (!e) return false;
      e.is_soft_deleted = false;
      e.updated_at = new Date().toISOString();
      return true;
    }

    const pool = getDbPool();
    const query = `
      UPDATE expenses
      SET is_soft_deleted = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
    `;
    const res = await pool.query(query, [id, userId]);
    return (res.rowCount ?? 0) > 0;
  }

  static async hardDelete(id: number, userId: number): Promise<boolean> {
    if (isDatabaseMocked()) {
      const idx = mockDb.expenses.findIndex((exp) => exp.id === id && exp.user_id === userId);
      if (idx === -1) return false;
      mockDb.expenses.splice(idx, 1);
      return true;
    }

    const pool = getDbPool();
    const query = `
      DELETE FROM expenses
      WHERE id = $1 AND user_id = $2
    `;
    const res = await pool.query(query, [id, userId]);
    return (res.rowCount ?? 0) > 0;
  }
}

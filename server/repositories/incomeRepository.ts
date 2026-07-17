import { getDbPool, isDatabaseMocked } from "../config/db.js";
import mockDb, { IncomeRow } from "./mockDb.js";

export interface IncomeQueryParams {
  limit?: number;
  offset?: number;
  sortBy?: "date" | "amount" | "created_at";
  sortOrder?: "ASC" | "DESC";
  startDate?: string;
  endDate?: string;
  categoryId?: number;
  search?: string;
  includeDeleted?: boolean;
}

export class IncomeRepository {
  static async findAll(userId: number, params: IncomeQueryParams): Promise<{ rows: any[]; totalCount: number }> {
    const limit = params.limit || 10;
    const offset = params.offset || 0;
    const sortBy = params.sortBy || "date";
    const sortOrder = params.sortOrder || "DESC";
    const includeDeleted = params.includeDeleted || false;

    if (isDatabaseMocked()) {
      let list = mockDb.income.filter((i) => i.user_id === userId);

      if (!includeDeleted) {
        list = list.filter((i) => !i.is_soft_deleted);
      }

      if (params.categoryId) {
        list = list.filter((i) => i.category_id === params.categoryId);
      }

      if (params.startDate) {
        list = list.filter((i) => i.date >= params.startDate!);
      }

      if (params.endDate) {
        list = list.filter((i) => i.date <= params.endDate!);
      }

      if (params.search) {
        const query = params.search.toLowerCase();
        list = list.filter(
          (i) =>
            i.source.toLowerCase().includes(query) ||
            (i.notes && i.notes.toLowerCase().includes(query))
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
      const resultRows = paginatedList.map((i) => {
        const cat = mockDb.categories.find((c) => c.id === i.category_id);
        return {
          ...i,
          category_name: cat ? cat.name : "Uncategorized",
          category_color: cat ? cat.color : "#10B981",
          category_icon: cat ? cat.icon : "Briefcase",
        };
      });

      return { rows: resultRows, totalCount };
    }

    const pool = getDbPool();
    const conditions: string[] = ["i.user_id = $1"];
    const values: any[] = [userId];
    let valIdx = 2;

    if (!includeDeleted) {
      conditions.push(`i.is_soft_deleted = FALSE`);
    }

    if (params.categoryId) {
      conditions.push(`i.category_id = $${valIdx++}`);
      values.push(params.categoryId);
    }

    if (params.startDate) {
      conditions.push(`i.date >= $${valIdx++}`);
      values.push(params.startDate);
    }

    if (params.endDate) {
      conditions.push(`i.date <= $${valIdx++}`);
      values.push(params.endDate);
    }

    if (params.search) {
      conditions.push(`(LOWER(i.source) LIKE LOWER($${valIdx}) OR LOWER(i.notes) LIKE LOWER($${valIdx}))`);
      values.push(`%${params.search}%`);
      valIdx++;
    }

    const whereClause = conditions.join(" AND ");

    // Get Total Count
    const countQuery = `SELECT COUNT(*)::INTEGER as count FROM income i WHERE ${whereClause}`;
    const countRes = await pool.query(countQuery, values);
    const totalCount = countRes.rows[0]?.count || 0;

    // Fetch Paginated Rows
    const orderCol = sortBy === "amount" ? "i.amount" : sortBy === "created_at" ? "i.created_at" : "i.date";
    const dataQuery = `
      SELECT 
        i.id, i.user_id, i.category_id, i.source, i.amount::FLOAT as amount, 
        i.date::VARCHAR as date, i.notes, i.receipt_url, i.receipt_screenshot, i.is_soft_deleted, i.created_at, i.updated_at,
        c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM income i
      LEFT JOIN categories c ON i.category_id = c.id
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
      const i = mockDb.income.find((inc) => inc.id === id && inc.user_id === userId);
      if (!i) return null;
      const cat = mockDb.categories.find((c) => c.id === i.category_id);
      return {
        ...i,
        category_name: cat ? cat.name : "Uncategorized",
        category_color: cat ? cat.color : "#10B981",
        category_icon: cat ? cat.icon : "Briefcase",
      };
    }

    const pool = getDbPool();
    const query = `
      SELECT 
        i.id, i.user_id, i.category_id, i.source, i.amount::FLOAT as amount, 
        i.date::VARCHAR as date, i.notes, i.receipt_url, i.receipt_screenshot, i.is_soft_deleted, i.created_at, i.updated_at,
        c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM income i
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.id = $1 AND i.user_id = $2
    `;
    const res = await pool.query(query, [id, userId]);
    return res.rows[0] || null;
  }

  static async create(
    userId: number,
    data: {
      source: string;
      amount: number;
      categoryId: number | null;
      date: string;
      notes?: string;
      receiptUrl?: string;
      receiptScreenshot?: string;
    }
  ): Promise<IncomeRow> {
    if (isDatabaseMocked()) {
      const newRow: IncomeRow = {
        id: mockDb.getIncomeId(),
        user_id: userId,
        category_id: data.categoryId,
        source: data.source,
        amount: data.amount,
        date: data.date,
        notes: data.notes || null,
        receipt_url: data.receiptUrl || null,
        receipt_screenshot: data.receiptScreenshot || null,
        is_soft_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockDb.income.push(newRow);
      return { ...newRow };
    }

    const pool = getDbPool();
    const query = `
      INSERT INTO income (user_id, category_id, source, amount, date, notes, receipt_url, receipt_screenshot)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, user_id, category_id, source, amount::FLOAT as amount, date::VARCHAR as date, notes, receipt_url, receipt_screenshot, is_soft_deleted, created_at, updated_at
    `;
    const res = await pool.query(query, [
      userId,
      data.categoryId,
      data.source,
      data.amount,
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
      source?: string;
      amount?: number;
      categoryId?: number | null;
      date?: string;
      notes?: string;
      receiptUrl?: string | null;
      receiptScreenshot?: string | null;
    }
  ): Promise<IncomeRow | null> {
    if (isDatabaseMocked()) {
      const idx = mockDb.income.findIndex((inc) => inc.id === id && inc.user_id === userId);
      if (idx === -1) return null;

      const i = mockDb.income[idx];
      if (data.source !== undefined) i.source = data.source;
      if (data.amount !== undefined) i.amount = data.amount;
      if (data.categoryId !== undefined) i.category_id = data.categoryId;
      if (data.date !== undefined) i.date = data.date;
      if (data.notes !== undefined) i.notes = data.notes;
      if (data.receiptUrl !== undefined) i.receipt_url = data.receiptUrl;
      if (data.receiptScreenshot !== undefined) i.receipt_screenshot = data.receiptScreenshot;
      i.updated_at = new Date().toISOString();

      return { ...i };
    }

    const pool = getDbPool();
    const updates: string[] = [];
    const values: any[] = [];
    let valIdx = 1;

    if (data.source !== undefined) {
      updates.push(`source = $${valIdx++}`);
      values.push(data.source);
    }
    if (data.amount !== undefined) {
      updates.push(`amount = $${valIdx++}`);
      values.push(data.amount);
    }
    if (data.categoryId !== undefined) {
      updates.push(`category_id = $${valIdx++}`);
      values.push(data.categoryId);
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
      UPDATE income
      SET ${updates.join(", ")}
      WHERE id = $${idIdx} AND user_id = $${userIdx}
      RETURNING id, user_id, category_id, source, amount::FLOAT as amount, date::VARCHAR as date, notes, receipt_url, receipt_screenshot, is_soft_deleted, created_at, updated_at
    `;
    const res = await pool.query(query, values);
    return res.rows[0] || null;
  }

  static async softDelete(id: number, userId: number): Promise<boolean> {
    if (isDatabaseMocked()) {
      const i = mockDb.income.find((inc) => inc.id === id && inc.user_id === userId);
      if (!i) return false;
      i.is_soft_deleted = true;
      i.updated_at = new Date().toISOString();
      return true;
    }

    const pool = getDbPool();
    const query = `
      UPDATE income
      SET is_soft_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
    `;
    const res = await pool.query(query, [id, userId]);
    return (res.rowCount ?? 0) > 0;
  }

  static async restore(id: number, userId: number): Promise<boolean> {
    if (isDatabaseMocked()) {
      const i = mockDb.income.find((inc) => inc.id === id && inc.user_id === userId);
      if (!i) return false;
      i.is_soft_deleted = false;
      i.updated_at = new Date().toISOString();
      return true;
    }

    const pool = getDbPool();
    const query = `
      UPDATE income
      SET is_soft_deleted = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
    `;
    const res = await pool.query(query, [id, userId]);
    return (res.rowCount ?? 0) > 0;
  }

  static async hardDelete(id: number, userId: number): Promise<boolean> {
    if (isDatabaseMocked()) {
      const idx = mockDb.income.findIndex((inc) => inc.id === id && inc.user_id === userId);
      if (idx === -1) return false;
      mockDb.income.splice(idx, 1);
      return true;
    }

    const pool = getDbPool();
    const query = `
      DELETE FROM income
      WHERE id = $1 AND user_id = $2
    `;
    const res = await pool.query(query, [id, userId]);
    return (res.rowCount ?? 0) > 0;
  }
}

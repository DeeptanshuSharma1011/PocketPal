import { getDbPool, isDatabaseMocked } from "../config/db.js";
import mockDb, { BudgetRow } from "./mockDb.js";

export class BudgetRepository {
  static async findByPeriod(userId: number, month: number, year: number): Promise<any[]> {
    if (isDatabaseMocked()) {
      const list = mockDb.budgets.filter((b) => b.user_id === userId && b.month === month && b.year === year);
      return list.map((b) => {
        const cat = mockDb.categories.find((c) => c.id === b.category_id);
        return {
          ...b,
          category_name: cat ? cat.name : "Overall Budget",
          category_color: cat ? cat.color : "#3B82F6",
          category_icon: cat ? cat.icon : "Coins",
        };
      });
    }

    const pool = getDbPool();
    const query = `
      SELECT 
        b.id, b.user_id, b.category_id, b.amount::FLOAT as amount, b.month, b.year, b.created_at, b.updated_at,
        c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
    `;
    const res = await pool.query(query, [userId, month, year]);
    return res.rows;
  }

  static async findById(id: number, userId: number): Promise<any | null> {
    if (isDatabaseMocked()) {
      const b = mockDb.budgets.find((b) => b.id === id && b.user_id === userId);
      if (!b) return null;
      const cat = mockDb.categories.find((c) => c.id === b.category_id);
      return {
        ...b,
        category_name: cat ? cat.name : "Overall Budget",
        category_color: cat ? cat.color : "#3B82F6",
        category_icon: cat ? cat.icon : "Coins",
      };
    }

    const pool = getDbPool();
    const query = `
      SELECT 
        b.id, b.user_id, b.category_id, b.amount::FLOAT as amount, b.month, b.year, b.created_at, b.updated_at,
        c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = $1 AND b.user_id = $2
    `;
    const res = await pool.query(query, [id, userId]);
    return res.rows[0] || null;
  }

  static async upsert(
    userId: number,
    categoryId: number | null,
    amount: number,
    month: number,
    year: number
  ): Promise<BudgetRow> {
    if (isDatabaseMocked()) {
      const existingIdx = mockDb.budgets.findIndex(
        (b) => b.user_id === userId && b.category_id === categoryId && b.month === month && b.year === year
      );

      if (existingIdx !== -1) {
        const b = mockDb.budgets[existingIdx];
        b.amount = amount;
        b.updated_at = new Date().toISOString();
        return { ...b };
      } else {
        const newRow: BudgetRow = {
          id: mockDb.getBudgetId(),
          user_id: userId,
          category_id: categoryId,
          amount,
          month,
          year,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        mockDb.budgets.push(newRow);
        return { ...newRow };
      }
    }

    const pool = getDbPool();
    // In PostgreSQL, we can use INSERT ... ON CONFLICT ON CONSTRAINT or UNIQUE indexes
    // We can do it by creating a unique constraint (which is in our supabase_schema.sql DDL)
    const query = `
      INSERT INTO budgets (user_id, category_id, amount, month, year)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, COALESCE(category_id, -1), month, year) 
      DO UPDATE SET amount = EXCLUDED.amount, updated_at = CURRENT_TIMESTAMP
      RETURNING id, user_id, category_id, amount::FLOAT as amount, month, year, created_at, updated_at
    `;
    
    // Note: To handle COALESCE on category_id in the unique index of Postgres:
    // In our schema we defined: CONSTRAINT unique_user_category_month_year UNIQUE(user_id, category_id, month, year)
    // In Standard SQL, UNIQUE constraint allows multiple NULL values, but PostgreSQL unique index can handle COALESCE or we can just run a select-then-insert/update query for absolute safety.
    // Let's implement select-then-insert/update query in pg for total compatibility with all Supabase setups!
    const findQuery = `
      SELECT id FROM budgets 
      WHERE user_id = $1 AND (category_id = $2 OR (category_id IS NULL AND $2 IS NULL)) AND month = $3 AND year = $4
    `;
    const findRes = await pool.query(findQuery, [userId, categoryId, month, year]);

    if (findRes.rows.length > 0) {
      const updateQuery = `
        UPDATE budgets 
        SET amount = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2 
        RETURNING id, user_id, category_id, amount::FLOAT as amount, month, year, created_at, updated_at
      `;
      const updateRes = await pool.query(updateQuery, [amount, findRes.rows[0].id]);
      return updateRes.rows[0];
    } else {
      const insertQuery = `
        INSERT INTO budgets (user_id, category_id, amount, month, year)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, user_id, category_id, amount::FLOAT as amount, month, year, created_at, updated_at
      `;
      const insertRes = await pool.query(insertQuery, [userId, categoryId, amount, month, year]);
      return insertRes.rows[0];
    }
  }

  static async delete(id: number, userId: number): Promise<boolean> {
    if (isDatabaseMocked()) {
      const idx = mockDb.budgets.findIndex((b) => b.id === id && b.user_id === userId);
      if (idx === -1) return false;
      mockDb.budgets.splice(idx, 1);
      return true;
    }

    const pool = getDbPool();
    const query = `
      DELETE FROM budgets
      WHERE id = $1 AND user_id = $2
    `;
    const res = await pool.query(query, [id, userId]);
    return (res.rowCount ?? 0) > 0;
  }
}

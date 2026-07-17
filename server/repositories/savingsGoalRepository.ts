import { getDbPool, isDatabaseMocked } from "../config/db.js";
import mockDb, { SavingsGoalRow } from "./mockDb.js";

export class SavingsGoalRepository {
  static async findAll(userId: number): Promise<SavingsGoalRow[]> {
    if (isDatabaseMocked()) {
      return mockDb.savingsGoals.filter((s) => s.user_id === userId);
    }

    const pool = getDbPool();
    const query = `
      SELECT id, user_id, name, target_amount::FLOAT as target_amount, current_savings::FLOAT as current_savings, deadline::VARCHAR as deadline, created_at, updated_at
      FROM savings_goals
      WHERE user_id = $1
      ORDER BY deadline ASC
    `;
    const res = await pool.query(query, [userId]);
    return res.rows;
  }

  static async findById(id: number, userId: number): Promise<SavingsGoalRow | null> {
    if (isDatabaseMocked()) {
      const s = mockDb.savingsGoals.find((sg) => sg.id === id && sg.user_id === userId);
      return s ? { ...s } : null;
    }

    const pool = getDbPool();
    const query = `
      SELECT id, user_id, name, target_amount::FLOAT as target_amount, current_savings::FLOAT as current_savings, deadline::VARCHAR as deadline, created_at, updated_at
      FROM savings_goals
      WHERE id = $1 AND user_id = $2
    `;
    const res = await pool.query(query, [id, userId]);
    return res.rows[0] || null;
  }

  static async create(
    userId: number,
    data: { name: string; targetAmount: number; currentSavings?: number; deadline: string }
  ): Promise<SavingsGoalRow> {
    if (isDatabaseMocked()) {
      const newRow: SavingsGoalRow = {
        id: mockDb.getSavingsGoalId(),
        user_id: userId,
        name: data.name,
        target_amount: data.targetAmount,
        current_savings: data.currentSavings || 0.0,
        deadline: data.deadline,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockDb.savingsGoals.push(newRow);
      return { ...newRow };
    }

    const pool = getDbPool();
    const query = `
      INSERT INTO savings_goals (user_id, name, target_amount, current_savings, deadline)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, name, target_amount::FLOAT as target_amount, current_savings::FLOAT as current_savings, deadline::VARCHAR as deadline, created_at, updated_at
    `;
    const res = await pool.query(query, [
      userId,
      data.name,
      data.targetAmount,
      data.currentSavings || 0.0,
      data.deadline,
    ]);
    return res.rows[0];
  }

  static async update(
    id: number,
    userId: number,
    data: { name?: string; targetAmount?: number; currentSavings?: number; deadline?: string }
  ): Promise<SavingsGoalRow | null> {
    if (isDatabaseMocked()) {
      const idx = mockDb.savingsGoals.findIndex((sg) => sg.id === id && sg.user_id === userId);
      if (idx === -1) return null;

      const s = mockDb.savingsGoals[idx];
      if (data.name !== undefined) s.name = data.name;
      if (data.targetAmount !== undefined) s.target_amount = data.targetAmount;
      if (data.currentSavings !== undefined) s.current_savings = data.currentSavings;
      if (data.deadline !== undefined) s.deadline = data.deadline;
      s.updated_at = new Date().toISOString();

      return { ...s };
    }

    const pool = getDbPool();
    const updates: string[] = [];
    const values: any[] = [];
    let valIdx = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${valIdx++}`);
      values.push(data.name);
    }
    if (data.targetAmount !== undefined) {
      updates.push(`target_amount = $${valIdx++}`);
      values.push(data.targetAmount);
    }
    if (data.currentSavings !== undefined) {
      updates.push(`current_savings = $${valIdx++}`);
      values.push(data.currentSavings);
    }
    if (data.deadline !== undefined) {
      updates.push(`deadline = $${valIdx++}`);
      values.push(data.deadline);
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
      UPDATE savings_goals
      SET ${updates.join(", ")}
      WHERE id = $${idIdx} AND user_id = $${userIdx}
      RETURNING id, user_id, name, target_amount::FLOAT as target_amount, current_savings::FLOAT as current_savings, deadline::VARCHAR as deadline, created_at, updated_at
    `;
    const res = await pool.query(query, values);
    return res.rows[0] || null;
  }

  static async delete(id: number, userId: number): Promise<boolean> {
    if (isDatabaseMocked()) {
      const idx = mockDb.savingsGoals.findIndex((sg) => sg.id === id && sg.user_id === userId);
      if (idx === -1) return false;
      mockDb.savingsGoals.splice(idx, 1);
      return true;
    }

    const pool = getDbPool();
    const query = `
      DELETE FROM savings_goals
      WHERE id = $1 AND user_id = $2
    `;
    const res = await pool.query(query, [id, userId]);
    return (res.rowCount ?? 0) > 0;
  }
}

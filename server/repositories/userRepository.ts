import { getDbPool, isDatabaseMocked } from "../config/db.js";
import mockDb, { UserRow } from "./mockDb.js";

export interface UserDTO {
  id: number;
  email: string;
  name: string;
  monthly_income: number;
  currency: string;
  profile_picture: string | null;
  created_at: string;
  updated_at: string;
}

export class UserRepository {
  static async findByEmail(email: string): Promise<UserRow | null> {
    if (isDatabaseMocked()) {
      const u = mockDb.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
      return u ? { ...u } : null;
    }

    const pool = getDbPool();
    const query = `
      SELECT id, email, password_hash, name, monthly_income::FLOAT as monthly_income, currency, profile_picture, created_at, updated_at 
      FROM users 
      WHERE LOWER(email) = LOWER($1)
    `;
    const res = await pool.query(query, [email]);
    return res.rows[0] || null;
  }

  static async findById(id: number): Promise<UserRow | null> {
    if (isDatabaseMocked()) {
      const u = mockDb.users.find((user) => user.id === id);
      return u ? { ...u } : null;
    }

    const pool = getDbPool();
    const query = `
      SELECT id, email, password_hash, name, monthly_income::FLOAT as monthly_income, currency, profile_picture, created_at, updated_at 
      FROM users 
      WHERE id = $1
    `;
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }

  static async create(email: string, passwordHash: string, name: string): Promise<UserRow> {
    if (isDatabaseMocked()) {
      const newUser: UserRow = {
        id: mockDb.getUserId(),
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name,
        monthly_income: 0.0,
        currency: "USD",
        profile_picture: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockDb.users.push(newUser);
      return { ...newUser };
    }

    const pool = getDbPool();
    const query = `
      INSERT INTO users (email, password_hash, name)
      VALUES ($1, $2, $3)
      RETURNING id, email, password_hash, name, monthly_income::FLOAT as monthly_income, currency, profile_picture, created_at, updated_at
    `;
    const res = await pool.query(query, [email.toLowerCase(), passwordHash, name]);
    return res.rows[0];
  }

  static async update(
    id: number,
    fields: { name?: string; monthlyIncome?: number; currency?: string; profilePicture?: string | null }
  ): Promise<UserRow | null> {
    if (isDatabaseMocked()) {
      const idx = mockDb.users.findIndex((user) => user.id === id);
      if (idx === -1) return null;
      
      const user = mockDb.users[idx];
      if (fields.name !== undefined) user.name = fields.name;
      if (fields.monthlyIncome !== undefined) user.monthly_income = fields.monthlyIncome;
      if (fields.currency !== undefined) user.currency = fields.currency;
      if (fields.profilePicture !== undefined) user.profile_picture = fields.profilePicture;
      user.updated_at = new Date().toISOString();
      
      return { ...user };
    }

    const pool = getDbPool();
    const updates: string[] = [];
    const values: any[] = [];
    let valIdx = 1;

    if (fields.name !== undefined) {
      updates.push(`name = $${valIdx++}`);
      values.push(fields.name);
    }
    if (fields.monthlyIncome !== undefined) {
      updates.push(`monthly_income = $${valIdx++}`);
      values.push(fields.monthlyIncome);
    }
    if (fields.currency !== undefined) {
      updates.push(`currency = $${valIdx++}`);
      values.push(fields.currency);
    }
    if (fields.profilePicture !== undefined) {
      updates.push(`profile_picture = $${valIdx++}`);
      values.push(fields.profilePicture);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    const idIdx = valIdx;

    const query = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = $${idIdx}
      RETURNING id, email, password_hash, name, monthly_income::FLOAT as monthly_income, currency, profile_picture, created_at, updated_at
    `;
    const res = await pool.query(query, values);
    return res.rows[0] || null;
  }

  static async updatePassword(id: number, passwordHash: string): Promise<boolean> {
    if (isDatabaseMocked()) {
      const user = mockDb.users.find((u) => u.id === id);
      if (!user) return false;
      user.password_hash = passwordHash;
      user.updated_at = new Date().toISOString();
      return true;
    }

    const pool = getDbPool();
    const query = `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    const res = await pool.query(query, [passwordHash, id]);
    return (res.rowCount ?? 0) > 0;
  }
}

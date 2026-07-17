import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const { Pool } = pg;

let pool: pg.Pool | null = null;
let isMockMode = false;

export function getDbPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString || connectionString.includes("postgres://postgres:password")) {
    isMockMode = true;
    // Return a dummy pool to avoid crash, but flag it so repositories can switch to in-memory mode if needed.
    if (!pool) {
      pool = new Pool();
    }
    return pool;
  }

  if (!pool) {
    console.log("[Database Config] Initializing PostgreSQL connection pool to Supabase...");
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("supabase.co") || connectionString.includes("render.com")
        ? { rejectUnauthorized: false }
        : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("error", (err) => {
      console.error("[Database Config] Unexpected error on idle client:", err);
    });
  }

  return pool;
}

export async function deduplicateCategories(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if the categories table exists before attempting deduplication
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'categories'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log("[Database Deduplication] categories table does not exist yet. Skipping deduplication.");
      await client.query("COMMIT");
      return;
    }

    // 1. Find duplicate global categories (user_id IS NULL)
    const findDupesQuery = `
      SELECT name, type, ARRAY_AGG(id ORDER BY id ASC) as ids
      FROM categories
      WHERE user_id IS NULL
      GROUP BY name, type
      HAVING COUNT(*) > 1
    `;
    const dupesResult = await client.query(findDupesQuery);

    if (dupesResult.rows.length > 0) {
      console.log(`[Database Deduplication] Found ${dupesResult.rows.length} duplicate category groups. Starting migration...`);
      
      for (const row of dupesResult.rows) {
        const { name, type, ids } = row;
        const keepId = ids[0];
        const deleteIds = ids.slice(1);

        console.log(`[Database Deduplication] Merging category "${name}" (${type}). Keeping ID ${keepId}, deleting IDs: ${deleteIds.join(", ")}`);

        // Update income references
        await client.query(
          "UPDATE income SET category_id = $1 WHERE category_id = ANY($2::int[])",
          [keepId, deleteIds]
        );

        // Update expenses references
        await client.query(
          "UPDATE expenses SET category_id = $1 WHERE category_id = ANY($2::int[])",
          [keepId, deleteIds]
        );

        // Update recurring_transactions references
        await client.query(
          "UPDATE recurring_transactions SET category_id = $1 WHERE category_id = ANY($2::int[])",
          [keepId, deleteIds]
        );

        // Update budgets (avoiding duplicate key violations by deleting/merging duplicate budgets)
        const budgetsToUpdateRes = await client.query(
          "SELECT id, user_id, month, year, amount FROM budgets WHERE category_id = ANY($1::int[])",
          [deleteIds]
        );

        for (const budget of budgetsToUpdateRes.rows) {
          const existingMasterBudgetRes = await client.query(
            "SELECT id, amount FROM budgets WHERE user_id = $1 AND category_id = $2 AND month = $3 AND year = $4",
            [budget.user_id, keepId, budget.month, budget.year]
          );

          if (existingMasterBudgetRes.rows.length > 0) {
            const masterBudgetId = existingMasterBudgetRes.rows[0].id;
            const newAmount = Number(existingMasterBudgetRes.rows[0].amount) + Number(budget.amount);
            
            // Sum the duplicate budgets and update the master
            await client.query("UPDATE budgets SET amount = $1 WHERE id = $2", [newAmount, masterBudgetId]);
            // Delete the duplicate budget
            await client.query("DELETE FROM budgets WHERE id = $1", [budget.id]);
          } else {
            // No budget for the master category exists, safe to simply update
            await client.query("UPDATE budgets SET category_id = $1 WHERE id = $2", [keepId, budget.id]);
          }
        }

        // Delete the duplicate categories
        await client.query(
          "DELETE FROM categories WHERE id = ANY($1::int[])",
          [deleteIds]
        );
      }
      console.log("[Database Deduplication] Duplicate categories merged and deleted successfully.");
    }

    // 2. Safely create the unique index on categories table so duplicates can never be inserted again
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_global_categories 
      ON categories (name, type) 
      WHERE user_id IS NULL
    `);

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("[Database Deduplication] Error during category deduplication:", err.message || err);
  } finally {
    client.release();
  }
}

export async function initializeDatabaseSchema(dbPool: pg.Pool): Promise<void> {
  if (isDatabaseMocked()) {
    console.log("[Database Config] Database is mocked, skipping auto-migration.");
    return;
  }

  try {
    // Run category deduplication and unique index creation first
    await deduplicateCategories(dbPool);

    const schemaPath = path.join(process.cwd(), "supabase_schema.sql");
    if (!fs.existsSync(schemaPath)) {
      console.warn("[Database Config] Schema file supabase_schema.sql not found at " + schemaPath + ". Skipping auto-migration.");
      return;
    }

    console.log("[Database Config] Reading database schema from " + schemaPath);
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");

    console.log("[Database Config] Executing auto-migration SQL against Supabase database...");
    await dbPool.query(schemaSql);
    console.log("[Database Config] Auto-migration complete! Database tables are initialized.");
  } catch (err: any) {
    console.error("[Database Config] Auto-migration failed:", err.message || err);
  }
}

export function checkDatabaseConnection(): Promise<{ connected: boolean; message: string }> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes("postgres://postgres:password")) {
    return Promise.resolve({
      connected: false,
      message: "DATABASE_URL is not configured. Running in Local Memory (Sandbox Demo) mode.",
    });
  }

  const dbPool = getDbPool();
  return dbPool
    .query("SELECT NOW()")
    .then(() => ({
      connected: true,
      message: "Successfully connected to Supabase PostgreSQL Database",
    }))
    .catch((err) => ({
      connected: false,
      message: `Failed to connect to database: ${err.message}`,
    }));
}

export function isDatabaseMocked(): boolean {
  const connectionString = process.env.DATABASE_URL;
  return !connectionString || connectionString.includes("postgres://postgres:password");
}

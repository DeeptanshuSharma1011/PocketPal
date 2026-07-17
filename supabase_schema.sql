-- ====================================================================
-- POCKETPAL DATABASE SCHEMA
-- Target Provider: Supabase PostgreSQL
-- Recommended Setup: Copy & run this in the Supabase SQL Editor.
-- ====================================================================

-- Enable UUID extension if needed (we use SERIAL in this schema for simplicity and consistent queries, but support UUID if required)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  monthly_income DECIMAL(12, 2) DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'USD',
  profile_picture VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- NULL means global/default categories
  name VARCHAR(100) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  icon VARCHAR(50) NOT NULL,
  color VARCHAR(20) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name, type)
);

CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_global_categories ON categories (name, type) WHERE user_id IS NULL;

-- 3. INCOME TABLE
CREATE TABLE IF NOT EXISTS income (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  source VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  notes TEXT,
  receipt_url VARCHAR(255),
  receipt_screenshot TEXT,
  is_soft_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_income_user_date ON income(user_id, date);
CREATE INDEX IF NOT EXISTS idx_income_soft_deleted ON income(is_soft_deleted);

-- 4. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
  date DATE NOT NULL,
  notes TEXT,
  receipt_url VARCHAR(255),
  receipt_screenshot TEXT,
  is_soft_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_soft_deleted ON expenses(is_soft_deleted);

-- 5. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE, -- NULL means overall monthly budget
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_category_month_year UNIQUE(user_id, category_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_date ON budgets(user_id, year, month);

-- 6. SAVINGS GOALS TABLE
CREATE TABLE IF NOT EXISTS savings_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL CHECK (target_amount > 0),
  current_savings DECIMAL(12, 2) DEFAULT 0.00,
  deadline DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_savings_user ON savings_goals(user_id);

-- 7. RECURRING TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  title_or_source VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  next_execution_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_transactions(user_id);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'info', -- 'info', 'warning', 'success'
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);

-- 9. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL,
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);

-- 10. REFRESH TOKENS TABLE
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(512) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- SEED INITIAL SYSTEM DEFAULTS
-- ====================================================================

-- Standard Global Default Categories (User_id is NULL)
-- Income Categories
INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES
(NULL, 'Salary', 'income', 'Briefcase', '#10B981', TRUE),
(NULL, 'Freelance', 'income', 'Laptop', '#3B82F6', TRUE),
(NULL, 'Investments', 'income', 'TrendingUp', '#F59E0B', TRUE),
(NULL, 'Gifts/Others', 'income', 'Gift', '#8B5CF6', TRUE)
ON CONFLICT (name, type) WHERE user_id IS NULL DO NOTHING;

-- Expense Categories
INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES
(NULL, 'Food', 'expense', 'Utensils', '#EF4444', TRUE),
(NULL, 'Transport', 'expense', 'Car', '#3B82F6', TRUE),
(NULL, 'Shopping', 'expense', 'ShoppingBag', '#EC4899', TRUE),
(NULL, 'Entertainment', 'expense', 'Film', '#8B5CF6', TRUE),
(NULL, 'Bills', 'expense', 'CreditCard', '#F59E0B', TRUE),
(NULL, 'Medical', 'expense', 'HeartPulse', '#10B981', TRUE),
(NULL, 'Education', 'expense', 'GraduationCap', '#06B6D4', TRUE),
(NULL, 'Travel', 'expense', 'Plane', '#14B8A6', TRUE),
(NULL, 'Rent', 'expense', 'Home', '#6366F1', TRUE),
(NULL, 'Subscriptions', 'expense', 'Tv', '#84CC16', TRUE),
(NULL, 'Others', 'expense', 'Coins', '#6B7280', TRUE)
ON CONFLICT (name, type) WHERE user_id IS NULL DO NOTHING;

-- MIGRATIONS FOR EXISTING INSTANCES
ALTER TABLE income ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(255);
ALTER TABLE income ADD COLUMN IF NOT EXISTS receipt_screenshot TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_screenshot TEXT;


// PocketPal Unified Mock / Sandbox InMemory Database
// This handles all state when DATABASE_URL is not configured.
// It matches the relational design of our PostgreSQL DDL.

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  monthly_income: number;
  currency: string;
  profile_picture: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: number;
  user_id: number | null; // null for system defaults
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
  is_default: boolean;
  created_at: string;
}

export interface IncomeRow {
  id: number;
  user_id: number;
  category_id: number | null;
  source: string;
  amount: number;
  date: string; // YYYY-MM-DD
  notes: string | null;
  receipt_url: string | null;
  receipt_screenshot: string | null;
  is_soft_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseRow {
  id: number;
  user_id: number;
  category_id: number | null;
  title: string;
  amount: number;
  payment_method: string;
  date: string; // YYYY-MM-DD
  notes: string | null;
  receipt_url: string | null;
  receipt_screenshot: string | null;
  is_soft_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetRow {
  id: number;
  user_id: number;
  category_id: number | null; // null for overall budget
  amount: number;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoalRow {
  id: number;
  user_id: number;
  name: string;
  target_amount: number;
  current_savings: number;
  deadline: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface RecurringTransactionRow {
  id: number;
  user_id: number;
  type: "income" | "expense";
  title_or_source: string;
  amount: number;
  category_id: number | null;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  next_execution_date: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationRow {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: "info" | "warning" | "success";
  is_read: boolean;
  created_at: string;
}

export interface ActivityLogRow {
  id: number;
  user_id: number;
  action: string;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface RefreshTokenRow {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  created_at: string;
}

class MockDatabase {
  users: UserRow[] = [];
  categories: CategoryRow[] = [];
  income: IncomeRow[] = [];
  expenses: ExpenseRow[] = [];
  budgets: BudgetRow[] = [];
  savingsGoals: SavingsGoalRow[] = [];
  recurringTransactions: RecurringTransactionRow[] = [];
  notifications: NotificationRow[] = [];
  activityLogs: ActivityLogRow[] = [];
  refreshTokens: RefreshTokenRow[] = [];

  private userCounter = 1;
  private categoryCounter = 1;
  private incomeCounter = 1;
  private expenseCounter = 1;
  private budgetCounter = 1;
  private savingsGoalCounter = 1;
  private recurringCounter = 1;
  private notificationCounter = 1;
  private activityLogCounter = 1;
  private refreshTokenCounter = 1;

  constructor() {
    this.seedDefaultCategories();
    this.seedInitialUser();
  }

  private seedDefaultCategories() {
    const incomeNames = ["Salary", "Freelance", "Investments", "Gifts/Others"];
    const incomeIcons = ["Briefcase", "Laptop", "TrendingUp", "Gift"];
    const incomeColors = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6"];

    incomeNames.forEach((name, i) => {
      this.categories.push({
        id: this.categoryCounter++,
        user_id: null,
        name,
        type: "income",
        icon: incomeIcons[i],
        color: incomeColors[i],
        is_default: true,
        created_at: new Date().toISOString(),
      });
    });

    const expenseNames = [
      "Food",
      "Transport",
      "Shopping",
      "Entertainment",
      "Bills",
      "Medical",
      "Education",
      "Travel",
      "Rent",
      "Subscriptions",
      "Others",
    ];
    const expenseIcons = [
      "Utensils",
      "Car",
      "ShoppingBag",
      "Film",
      "CreditCard",
      "HeartPulse",
      "GraduationCap",
      "Plane",
      "Home",
      "Tv",
      "Coins",
    ];
    const expenseColors = [
      "#EF4444",
      "#3B82F6",
      "#EC4899",
      "#8B5CF6",
      "#F59E0B",
      "#10B981",
      "#06B6D4",
      "#14B8A6",
      "#6366F1",
      "#84CC16",
      "#6B7280",
    ];

    expenseNames.forEach((name, i) => {
      this.categories.push({
        id: this.categoryCounter++,
        user_id: null,
        name,
        type: "expense",
        icon: expenseIcons[i],
        color: expenseColors[i],
        is_default: true,
        created_at: new Date().toISOString(),
      });
    });
  }

  private seedInitialUser() {
    // Create an initial user for testing (demo@pocketpal.com / password123)
    // password123 hashed using bcrypt is $2a$10$wN9iL6M6C9S.yO46pZ2bC.VzYj6Xb4V2.7I/l8w0yXW9NgeB3/C8u
    const demoUser: UserRow = {
      id: this.userCounter++,
      email: "demo@pocketpal.com",
      // bcrypt hash for "password123"
      password_hash: "$2a$10$eRCHXhUpt/n/x98O7S9BpeJdZl21PZpSUpUqZ6Z.t.E9vF3O1Bf7S", 
      name: "Demo User",
      monthly_income: 5000.0,
      currency: "USD",
      profile_picture: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.users.push(demoUser);

    // Seed some initial financial data for demo user
    const foodCat = this.categories.find((c) => c.name === "Food")?.id || null;
    const rentCat = this.categories.find((c) => c.name === "Rent")?.id || null;
    const billsCat = this.categories.find((c) => c.name === "Bills")?.id || null;
    const salaryCat = this.categories.find((c) => c.name === "Salary")?.id || null;

    // Income
    this.income.push({
      id: this.incomeCounter++,
      user_id: demoUser.id,
      category_id: salaryCat,
      source: "Primary Job Monthly Salary",
      amount: 4500.0,
      date: new Date().toISOString().split("T")[0],
      notes: "Direct deposit monthly salary",
      receipt_url: null,
      receipt_screenshot: null,
      is_soft_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.income.push({
      id: this.incomeCounter++,
      user_id: demoUser.id,
      category_id: this.categories.find((c) => c.name === "Freelance")?.id || null,
      source: "Web Design Project",
      amount: 800.0,
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      notes: "Freelance UI work completed",
      receipt_url: null,
      receipt_screenshot: null,
      is_soft_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Expenses
    this.expenses.push({
      id: this.expenseCounter++,
      user_id: demoUser.id,
      category_id: rentCat,
      title: "Apartment Monthly Rent",
      amount: 1200.0,
      payment_method: "Bank Transfer",
      date: new Date().toISOString().split("T")[0],
      notes: "July rent payment",
      receipt_url: null,
      receipt_screenshot: null,
      is_soft_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.expenses.push({
      id: this.expenseCounter++,
      user_id: demoUser.id,
      category_id: foodCat,
      title: "Grocery Shopping Whole Foods",
      amount: 154.3,
      payment_method: "Credit Card",
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      notes: "Weekly grocery supply",
      receipt_url: null,
      receipt_screenshot: null,
      is_soft_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.expenses.push({
      id: this.expenseCounter++,
      user_id: demoUser.id,
      category_id: billsCat,
      title: "Electricity & Gas Bill",
      amount: 85.0,
      payment_method: "Direct Debit",
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      notes: "Utility monthly payment",
      receipt_url: null,
      receipt_screenshot: null,
      is_soft_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Budgets
    const now = new Date();
    this.budgets.push({
      id: this.budgetCounter++,
      user_id: demoUser.id,
      category_id: null, // Overall Monthly Budget
      amount: 3000.0,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.budgets.push({
      id: this.budgetCounter++,
      user_id: demoUser.id,
      category_id: foodCat,
      amount: 400.0,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Savings Goals
    this.savingsGoals.push({
      id: this.savingsGoalCounter++,
      user_id: demoUser.id,
      name: "Emergency Fund",
      target_amount: 10000.0,
      current_savings: 4500.0,
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Recurring Transactions
    this.recurringTransactions.push({
      id: this.recurringCounter++,
      user_id: demoUser.id,
      type: "expense",
      title_or_source: "Netflix Subscription",
      amount: 15.99,
      category_id: this.categories.find((c) => c.name === "Subscriptions")?.id || null,
      frequency: "monthly",
      next_execution_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      is_active: true,
      notes: "Standard HD plan",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Notifications
    this.notifications.push({
      id: this.notificationCounter++,
      user_id: demoUser.id,
      title: "Welcome to PocketPal!",
      message: "Start managing your cashflow, monthly budgets, and tracking your saving goals securely.",
      type: "success",
      is_read: false,
      created_at: new Date().toISOString(),
    });

    // Activity Logs
    this.activityLogs.push({
      id: this.activityLogCounter++,
      user_id: demoUser.id,
      action: "REGISTER",
      details: "Created demo account on server launch",
      ip_address: "127.0.0.1",
      created_at: new Date().toISOString(),
    });
  }

  // Id Incrementor Helpers
  getUserId() { return this.userCounter++; }
  getCategoryId() { return this.categoryCounter++; }
  getIncomeId() { return this.incomeCounter++; }
  getExpenseId() { return this.expenseCounter++; }
  getBudgetId() { return this.budgetCounter++; }
  getSavingsGoalId() { return this.savingsGoalCounter++; }
  getRecurringId() { return this.recurringCounter++; }
  getNotificationId() { return this.notificationCounter++; }
  getActivityLogId() { return this.activityLogCounter++; }
  getRefreshTokenId() { return this.refreshTokenCounter++; }
}

export const mockDb = new MockDatabase();
export default mockDb;

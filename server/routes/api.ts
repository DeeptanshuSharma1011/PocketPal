import { Router } from "express";
import { authenticateToken, optionalAuthenticateToken } from "../middleware/authMiddleware.js";
import { AuthController } from "../controllers/authController.js";
import { UserController } from "../controllers/userController.js";
import { DashboardController } from "../controllers/dashboardController.js";
import { ExpenseController } from "../controllers/expenseController.js";
import { IncomeController } from "../controllers/incomeController.js";
import { CategoryController } from "../controllers/categoryController.js";
import { BudgetController } from "../controllers/budgetController.js";
import { SavingsGoalController } from "../controllers/savingsGoalController.js";
import { RecurringTransactionController } from "../controllers/recurringTransactionController.js";
import { NotificationController } from "../controllers/notificationController.js";
import { ActivityLogController } from "../controllers/activityLogController.js";

const router = Router();

// ==========================================
// PUBLIC AUTH ROUTES
// ==========================================
router.post("/auth/register", AuthController.register);
router.post("/auth/login", AuthController.login);
router.post("/auth/refresh", AuthController.refresh);
router.post("/auth/logout", authenticateToken as any, AuthController.logout as any);

// ==========================================
// PROTECTED APIS (requires JWT check)
// ==========================================

// Server & Auth Status Indicator
router.get("/auth/status", optionalAuthenticateToken as any, AuthController.checkStatus as any);

// Profile Management
router.get("/profile", authenticateToken as any, UserController.getProfile as any);
router.put("/profile", authenticateToken as any, UserController.updateProfile as any);
router.put("/auth/change-password", authenticateToken as any, AuthController.changePassword as any);

// Dashboard Metrics & Chart Analytics
router.get("/dashboard", authenticateToken as any, DashboardController.getSummary as any);

// Expense Tracker CRUD (soft deletes + restores + hard deletes)
router.get("/expenses", authenticateToken as any, ExpenseController.getAll as any);
router.get("/expenses/:id", authenticateToken as any, ExpenseController.getById as any);
router.post("/expenses", authenticateToken as any, ExpenseController.create as any);
router.put("/expenses/:id", authenticateToken as any, ExpenseController.update as any);
router.delete("/expenses/:id", authenticateToken as any, ExpenseController.softDelete as any);
router.put("/expenses/:id/restore", authenticateToken as any, ExpenseController.restore as any);
router.delete("/expenses/:id/hard", authenticateToken as any, ExpenseController.hardDelete as any);

// Income Tracker CRUD
router.get("/income", authenticateToken as any, IncomeController.getAll as any);
router.get("/income/:id", authenticateToken as any, IncomeController.getById as any);
router.post("/income", authenticateToken as any, IncomeController.create as any);
router.put("/income/:id", authenticateToken as any, IncomeController.update as any);
router.delete("/income/:id", authenticateToken as any, IncomeController.softDelete as any);
router.put("/income/:id/restore", authenticateToken as any, IncomeController.restore as any);
router.delete("/income/:id/hard", authenticateToken as any, IncomeController.hardDelete as any);

// Financial Categories (default + custom user additions)
router.get("/categories", authenticateToken as any, CategoryController.getAll as any);
router.post("/categories", authenticateToken as any, CategoryController.create as any);
router.put("/categories/:id", authenticateToken as any, CategoryController.update as any);
router.delete("/categories/:id", authenticateToken as any, CategoryController.delete as any);

// Budget Allocations (Overall Monthly Budget + category limits)
router.get("/budgets", authenticateToken as any, BudgetController.getBudgetsByPeriod as any);
router.post("/budgets", authenticateToken as any, BudgetController.upsertBudget as any);
router.delete("/budgets/:id", authenticateToken as any, BudgetController.deleteBudget as any);

// Savings Goal CRUD
router.get("/savings-goals", authenticateToken as any, SavingsGoalController.getAll as any);
router.post("/savings-goals", authenticateToken as any, SavingsGoalController.create as any);
router.put("/savings-goals/:id", authenticateToken as any, SavingsGoalController.update as any);
router.delete("/savings-goals/:id", authenticateToken as any, SavingsGoalController.delete as any);

// Automated Recurring Transactions
router.get("/recurring", authenticateToken as any, RecurringTransactionController.getAll as any);
router.post("/recurring", authenticateToken as any, RecurringTransactionController.create as any);
router.put("/recurring/:id", authenticateToken as any, RecurringTransactionController.update as any);
router.delete("/recurring/:id", authenticateToken as any, RecurringTransactionController.delete as any);

// In-App Notification Banners & Limit Warning Feeds
router.get("/notifications", authenticateToken as any, NotificationController.getAll as any);
router.put("/notifications/read-all", authenticateToken as any, NotificationController.markAllAsRead as any);
router.put("/notifications/:id/read", authenticateToken as any, NotificationController.markAsRead as any);
router.delete("/notifications/:id", authenticateToken as any, NotificationController.delete as any);

// User Security Activity logs
router.get("/activity-logs", authenticateToken as any, ActivityLogController.getAll as any);

export default router;

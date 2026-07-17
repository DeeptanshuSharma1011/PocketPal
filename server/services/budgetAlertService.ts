import { BudgetRepository } from "../repositories/budgetRepository.js";
import { ExpenseRepository } from "../repositories/expenseRepository.js";
import { NotificationRepository } from "../repositories/notificationRepository.js";

export class BudgetAlertService {
  static async checkBudgets(userId: number, dateStr: string): Promise<void> {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;

      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      // 1. Fetch all budgets for the month
      const budgets = await BudgetRepository.findByPeriod(userId, month, year);
      if (budgets.length === 0) return;

      // 2. Fetch all non-deleted expenses for the month
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const endDate = new Date(new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01`).getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const { rows: expenses } = await ExpenseRepository.findAll(userId, {
        startDate,
        endDate,
        limit: 10000,
        includeDeleted: false,
      });

      const totalMonthlyExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

      // 3. Process each budget
      for (const b of budgets) {
        let spent = 0;
        let limitName = "";

        if (b.category_id === null) {
          spent = totalMonthlyExpenses;
          limitName = "Overall Monthly Budget";
        } else {
          spent = expenses
            .filter((e) => e.category_id === b.category_id)
            .reduce((sum, e) => sum + e.amount, 0);
          limitName = `"${b.category_name}" Category Budget`;
        }

        const percentage = b.amount > 0 ? (spent / b.amount) * 100 : 0;

        if (percentage >= 100) {
          // Trigger critical alert
          await NotificationRepository.create(userId, {
            title: "🚨 Budget Limit Exceeded!",
            message: `You have spent ${percentage.toFixed(0)}% of your ${limitName} (Spent: ${spent.toFixed(2)} / Limit: ${b.amount.toFixed(2)}). Consider pausing non-essential expenses.`,
            type: "warning",
          });
        } else if (percentage >= 80) {
          // Trigger near-limit warning
          await NotificationRepository.create(userId, {
            title: "⚠️ Budget Approaching Limit (80%+)",
            message: `You have used ${percentage.toFixed(0)}% of your ${limitName} (Spent: ${spent.toFixed(2)} / Limit: ${b.amount.toFixed(2)}). Keep an eye on your cashflow!`,
            type: "info",
          });
        }
      }
    } catch (err) {
      console.error("[BudgetAlertService] Error during budget check:", err);
    }
  }
}

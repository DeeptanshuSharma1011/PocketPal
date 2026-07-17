import { ExpenseRepository } from "../repositories/expenseRepository.js";
import { IncomeRepository } from "../repositories/incomeRepository.js";
import { BudgetRepository } from "../repositories/budgetRepository.js";
import { SavingsGoalRepository } from "../repositories/savingsGoalRepository.js";
import { CategoryRepository } from "../repositories/categoryRepository.js";

export class DashboardService {
  static async getSummary(userId: number, year?: number, month?: number): Promise<any> {
    const now = new Date();
    const activeYear = year || now.getFullYear();
    const activeMonth = month || now.getMonth() + 1;

    // Dates for current month range
    const startOfMonth = `${activeYear}-${String(activeMonth).padStart(2, "0")}-01`;
    const nextMonth = activeMonth === 12 ? 1 : activeMonth + 1;
    const nextYear = activeMonth === 12 ? activeYear + 1 : activeYear;
    const endOfMonth = new Date(new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01`).getTime() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // 1. Fetch Expenses and Incomes for the current month (limit set high to capture all)
    const { rows: monthlyExpenses } = await ExpenseRepository.findAll(userId, {
      startDate: startOfMonth,
      endDate: endOfMonth,
      limit: 10000,
      includeDeleted: false,
    });

    const { rows: monthlyIncomes } = await IncomeRepository.findAll(userId, {
      startDate: startOfMonth,
      endDate: endOfMonth,
      limit: 10000,
      includeDeleted: false,
    });

    // 2. Fetch all-time stats for cumulative balances
    const { rows: allTimeExpenses } = await ExpenseRepository.findAll(userId, {
      limit: 10000,
      includeDeleted: false,
    });

    const { rows: allTimeIncomes } = await IncomeRepository.findAll(userId, {
      limit: 10000,
      includeDeleted: false,
    });

    const totalIncomeAllTime = allTimeIncomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpensesAllTime = allTimeExpenses.reduce((sum, e) => sum + e.amount, 0);
    const cumulativeBalance = totalIncomeAllTime - totalExpensesAllTime;

    // 3. Current month aggregates
    const totalIncomeThisMonth = monthlyIncomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpensesThisMonth = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netSavingsThisMonth = totalIncomeThisMonth - totalExpensesThisMonth;

    // 4. Budgets and progress cards
    const budgets = await BudgetRepository.findByPeriod(userId, activeMonth, activeYear);
    const overallBudget = budgets.find((b) => b.category_id === null);
    
    const budgetAmount = overallBudget ? overallBudget.amount : 0;
    const budgetRemaining = overallBudget ? Math.max(0, overallBudget.amount - totalExpensesThisMonth) : 0;
    const budgetUsedPercentage = overallBudget && overallBudget.amount > 0 ? (totalExpensesThisMonth / overallBudget.amount) * 100 : 0;

    const categoryBudgetsProgress = budgets
      .filter((b) => b.category_id !== null)
      .map((b) => {
        const spent = monthlyExpenses
          .filter((e) => e.category_id === b.category_id)
          .reduce((sum, e) => sum + e.amount, 0);
        return {
          id: b.id,
          category_id: b.category_id,
          category_name: b.category_name,
          category_color: b.category_color,
          category_icon: b.category_icon,
          budget_limit: b.amount,
          spent,
          remaining: Math.max(0, b.amount - spent),
          percentage: b.amount > 0 ? (spent / b.amount) * 100 : 0,
        };
      });

    // 5. Savings goals progress
    const savingsGoals = await SavingsGoalRepository.findAll(userId);
    const totalTargetSavings = savingsGoals.reduce((sum, s) => sum + s.target_amount, 0);
    const totalCurrentSavings = savingsGoals.reduce((sum, s) => sum + s.current_savings, 0);
    const generalSavingsPercentage = totalTargetSavings > 0 ? (totalCurrentSavings / totalTargetSavings) * 100 : 0;

    // 6. Merged Recent Transactions (Latest 10 across both income and expense)
    const normalizedIncomes = monthlyIncomes.map((i) => ({
      id: i.id,
      transaction_type: "income",
      title: i.source,
      amount: i.amount,
      date: i.date,
      notes: i.notes,
      category_name: i.category_name,
      category_color: i.category_color,
      category_icon: i.category_icon,
      created_at: i.created_at,
    }));

    const normalizedExpenses = monthlyExpenses.map((e) => ({
      id: e.id,
      transaction_type: "expense",
      title: e.title,
      amount: e.amount,
      date: e.date,
      notes: e.notes,
      category_name: e.category_name,
      category_color: e.category_color,
      category_icon: e.category_icon,
      created_at: e.created_at,
    }));

    const recentTransactions = [...normalizedIncomes, ...normalizedExpenses]
      .sort((a, b) => {
        // Sort by date DESC, then by created_at DESC
        const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 10);

    // 7. Spending distribution by Category (for Recharts Pie Chart)
    const categoryTotals: { [key: string]: { value: number; color: string; icon: string } } = {};
    monthlyExpenses.forEach((e) => {
      const catName = e.category_name || "Uncategorized";
      if (!categoryTotals[catName]) {
        categoryTotals[catName] = {
          value: 0,
          color: e.category_color || "#6B7280",
          icon: e.category_icon || "Coins",
        };
      }
      categoryTotals[catName].value += e.amount;
    });

    const expenseDistribution = Object.keys(categoryTotals).map((name) => ({
      name,
      value: parseFloat(categoryTotals[name].value.toFixed(2)),
      color: categoryTotals[name].color,
      icon: categoryTotals[name].icon,
    }));

    // 8. Financial Trends (Monthly comparative datasets over the last 6 months for Bar/Line Charts)
    const historicalTrends = [];
    for (let i = 5; i >= 0; i--) {
      const trendDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const tMonth = trendDate.getMonth() + 1;
      const tYear = trendDate.getFullYear();

      const tStart = `${tYear}-${String(tMonth).padStart(2, "0")}-01`;
      const tNextMonth = tMonth === 12 ? 1 : tMonth + 1;
      const tNextYear = tMonth === 12 ? tYear + 1 : tYear;
      const tEnd = new Date(new Date(`${tNextYear}-${String(tNextMonth).padStart(2, "0")}-01`).getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const { rows: tExp } = await ExpenseRepository.findAll(userId, { startDate: tStart, endDate: tEnd, limit: 10000 });
      const { rows: tInc } = await IncomeRepository.findAll(userId, { startDate: tStart, endDate: tEnd, limit: 10000 });

      const expSum = tExp.reduce((sum, e) => sum + e.amount, 0);
      const incSum = tInc.reduce((sum, inc) => sum + inc.amount, 0);

      historicalTrends.push({
        monthName: trendDate.toLocaleDateString("en-US", { month: "short" }),
        year: tYear,
        income: parseFloat(incSum.toFixed(2)),
        expenses: parseFloat(expSum.toFixed(2)),
        savings: parseFloat((incSum - expSum).toFixed(2)),
      });
    }

    return {
      financials: {
        total_income_this_month: parseFloat(totalIncomeThisMonth.toFixed(2)),
        total_expenses_this_month: parseFloat(totalExpensesThisMonth.toFixed(2)),
        balance_this_month: parseFloat(netSavingsThisMonth.toFixed(2)),
        cumulative_balance: parseFloat(cumulativeBalance.toFixed(2)),
      },
      budget: {
        limit: budgetAmount,
        spent: totalExpensesThisMonth,
        remaining: budgetRemaining,
        percentage_used: budgetUsedPercentage,
      },
      savings: {
        total_target: totalTargetSavings,
        total_saved: totalCurrentSavings,
        percentage: generalSavingsPercentage,
        goals_count: savingsGoals.length,
      },
      category_budgets: categoryBudgetsProgress,
      recent_transactions: recentTransactions,
      charts: {
        expense_distribution: expenseDistribution,
        historical_trends: historicalTrends,
      },
    };
  }
}

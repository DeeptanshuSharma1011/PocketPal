import { RecurringTransactionRepository } from "../repositories/recurringTransactionRepository.js";
import { ExpenseRepository } from "../repositories/expenseRepository.js";
import { IncomeRepository } from "../repositories/incomeRepository.js";
import { NotificationRepository } from "../repositories/notificationRepository.js";
import { ActivityLogRepository } from "../repositories/activityLogRepository.js";
import { BudgetAlertService } from "./budgetAlertService.js";

export class RecurringExecutionService {
  static async processDueTransactions(): Promise<void> {
    try {
      // Find all active, due recurring definitions
      const dueRules = await RecurringTransactionRepository.findDueTransactions();
      if (dueRules.length === 0) return;

      console.log(`[Recurring Automated Service] Processing ${dueRules.length} due transactions...`);

      for (const rule of dueRules) {
        const todayStr = new Date().toISOString().split("T")[0];

        // 1. Insert the real transaction (Income or Expense)
        if (rule.type === "expense") {
          await ExpenseRepository.create(rule.user_id, {
            title: `[Auto] ${rule.title_or_source}`,
            amount: rule.amount,
            categoryId: rule.category_id,
            paymentMethod: "Auto Debit",
            date: todayStr,
            notes: rule.notes || `Processed automatically from recurring subscription rule`,
          });

          // Trigger budget analysis for expenses
          await BudgetAlertService.checkBudgets(rule.user_id, todayStr);

          // Notify User
          await NotificationRepository.create(rule.user_id, {
            title: "💸 Auto-Debit Processed",
            message: `Your automated expense "${rule.title_or_source}" of ${rule.amount} was charged and recorded.`,
            type: "info",
          });
        } else {
          await IncomeRepository.create(rule.user_id, {
            source: `[Auto] ${rule.title_or_source}`,
            amount: rule.amount,
            categoryId: rule.category_id,
            date: todayStr,
            notes: rule.notes || `Processed automatically from recurring income rule`,
          });

          // Notify User
          await NotificationRepository.create(rule.user_id, {
            title: "💰 Auto-Deposit Processed",
            message: `Your automated income "${rule.title_or_source}" of ${rule.amount} has been credited.`,
            type: "success",
          });
        }

        // 2. Compute the next execution date
        const nextDate = this.calculateNextExecutionDate(rule.next_execution_date, rule.frequency);

        // 3. Update the recurring rule's next execution date
        await RecurringTransactionRepository.update(rule.id, rule.user_id, {
          nextExecutionDate: nextDate,
        });

        // 4. Write audit activity logs
        await ActivityLogRepository.log(
          rule.user_id,
          "RECURRING_PROCESSED",
          `Automated execution processed for "${rule.title_or_source}" (${rule.type}). Next milestone: ${nextDate}`
        );
      }
    } catch (err) {
      console.error("[Recurring Automated Service] Processing failed:", err);
    }
  }

  private static calculateNextExecutionDate(currentDateStr: string, frequency: string): string {
    const current = new Date(currentDateStr);
    if (isNaN(current.getTime())) {
      return new Date().toISOString().split("T")[0];
    }

    switch (frequency.toLowerCase()) {
      case "daily":
        current.setDate(current.getDate() + 1);
        break;
      case "weekly":
        current.setDate(current.getDate() + 7);
        break;
      case "monthly":
        current.setMonth(current.getMonth() + 1);
        break;
      case "yearly":
        current.setFullYear(current.getFullYear() + 1);
        break;
      default:
        current.setMonth(current.getMonth() + 1); // Default to monthly
    }

    return current.toISOString().split("T")[0];
  }
}

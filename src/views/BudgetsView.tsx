import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import { CategoryIcon } from "../components/CategoryIcon.js";
import {
  Wallet,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  PiggyBank,
  Sparkles,
  Calendar
} from "lucide-react";

export const BudgetsView: React.FC = () => {
  const { api, user } = useAuth();

  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter periods
  const [activePeriod, setActivePeriod] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  // Upsert form inputs
  const [categoryId, setCategoryId] = useState(""); // empty = Overall
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const getCurrencySymbol = (code: string) => {
    switch (code?.toUpperCase()) {
      case "EUR": return "€";
      case "GBP": return "£";
      case "INR": return "₹";
      case "JPY": return "¥";
      default: return "$";
    }
  };
  const symbol = getCurrencySymbol(user?.currency || "USD");

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories");
      if (res.data.success) {
        // Only allow expense categories to have budget limits!
        const expenseOnly = res.data.data.filter((c: any) => c.type === "expense");
        setCategories(expenseOnly);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const res = await api.get("/budgets", {
        params: {
          month: activePeriod.month,
          year: activePeriod.year,
        }
      });
      if (res.data.success) {
        setBudgets(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [activePeriod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      setErrorMsg("Please enter a valid budget limit amount.");
      return;
    }

    const parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setErrorMsg("Limit must be a positive decimal number.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await api.post("/budgets", {
        categoryId: categoryId ? parseInt(categoryId, 10) : null,
        amount: parsedAmt,
        month: activePeriod.month,
        year: activePeriod.year,
      });

      if (res.data.success) {
        setAmount("");
        setSuccessMsg("Monthly budget allocated successfully!");
        fetchBudgets();
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || "Failed to configure budget.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBudget = async (id: number) => {
    if (confirm("Are you sure you want to delete this monthly budget limit?")) {
      try {
        await api.delete(`/budgets/${id}`);
        fetchBudgets();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-slate-900 text-2xl tracking-tight">Monthly Budgets</h2>
          <p className="text-slate-500 text-xs">Set specific limits on where your funds can flow</p>
        </div>

        {/* Period selection */}
        <div className="flex items-center gap-2 bg-white border border-slate-200/80 p-1.5 rounded-xl shadow-xs">
          <select
            value={activePeriod.month}
            onChange={(e) => setActivePeriod({ ...activePeriod, month: parseInt(e.target.value, 10) })}
            className="bg-transparent border-none text-xs font-semibold text-slate-700 outline-hidden py-1 px-2 cursor-pointer"
          >
            {months.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>
          <span className="w-px h-4 bg-slate-200" />
          <select
            value={activePeriod.year}
            onChange={(e) => setActivePeriod({ ...activePeriod, year: parseInt(e.target.value, 10) })}
            className="bg-transparent border-none text-xs font-semibold text-slate-700 outline-hidden py-1 px-2 cursor-pointer"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: BUDGET SETTINGS FORM */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs h-fit space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center">
              <Wallet size={16} />
            </div>
            <h3 className="font-display font-bold text-slate-800 text-sm">Configure Limit</h3>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl font-medium">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Category selection */}
            <div className="space-y-1">
              <label className="block font-semibold text-slate-600">Budget Classification</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl py-2 px-3 text-slate-800 outline-hidden cursor-pointer"
              >
                <option value="">Overall Monthly (All Expenses Combined)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    Category: {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Limit Amount */}
            <div className="space-y-1">
              <label className="block font-semibold text-slate-600">Max Expenditure Limit ({symbol})</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl py-2.5 px-3 text-slate-800 font-mono outline-hidden"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-2.5 rounded-xl font-semibold shadow-md shadow-teal-600/10 transition-all flex items-center justify-center cursor-pointer"
            >
              {submitting ? "Processing..." : "Secure Budget Allocation"}
            </button>
          </form>

          {/* Context Notice */}
          <div className="bg-slate-50 p-3 rounded-xl border text-[10px] text-slate-500 leading-normal">
            <span className="font-bold text-slate-700 block mb-1">💡 SaaS Budgeting Concept:</span>
            PocketPal scans your expenses for {months[activePeriod.month - 1]} {activePeriod.year} and compares them instantly with these limits. Alert notices are dispatched at 80% and 100% thresholds.
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE BUDGET PROGRESS METER LIST (Span 2) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs lg:col-span-2 space-y-4">
          <div>
            <h3 className="font-display font-bold text-slate-800 text-sm">Active Allocations Progress</h3>
            <p className="text-[10px] text-slate-400">Comparing recorded expenses against limits for this period</p>
          </div>

          {loading ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Analyzing cash limit statuses...</p>
            </div>
          ) : budgets.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-xl">
              <p className="text-xs text-slate-400 font-semibold">No budget limits configured for this month.</p>
              <p className="text-[10px] text-slate-400 mt-1">Use the form on the left to set an overall or category-specific limit.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {budgets.map((b) => {
                const spent = b.spent_amount || 0;
                const percentage = b.amount > 0 ? (spent / b.amount) * 100 : 0;
                const isOver = percentage >= 100;
                const isWarning = percentage >= 80 && percentage < 100;

                return (
                  <div key={b.id} className="p-4 bg-slate-50/50 rounded-xl border border-slate-200/40 relative group hover:shadow-xs transition-all">
                    {/* Header line */}
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
                          style={{
                            backgroundColor: `${b.category_color}10` || "#0d948810",
                            borderColor: `${b.category_color}30` || "#0d948830",
                            color: b.category_color || "#0d9488"
                          }}
                        >
                          <CategoryIcon name={b.category_icon || "Wallet"} size={13} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-display font-bold text-slate-800 text-xs">
                            {b.category_name || "Overall Budget Limit"}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            Period: {months[b.month - 1]} {b.year}
                          </p>
                        </div>
                      </div>

                      {/* Delete Trigger */}
                      <button
                        onClick={() => handleDeleteBudget(b.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Remove budget limit"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Progress Slider */}
                    <div className="space-y-1.5">
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOver ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-teal-600"
                          }`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>

                      {/* Stat summary */}
                      <div className="flex justify-between items-center text-[10px] font-semibold">
                        <span className="text-slate-500">
                          Spent: <strong className="text-slate-700 font-ledger">{symbol}{spent.toFixed(2)}</strong> of {symbol}{b.amount.toFixed(2)}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          {isOver ? (
                            <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold">
                              <AlertTriangle size={10} />
                              <span>LIMIT EXCEEDED ({percentage.toFixed(0)}%)</span>
                            </span>
                          ) : isWarning ? (
                            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold">
                              <AlertTriangle size={10} />
                              <span>APPROACHING ({percentage.toFixed(0)}%)</span>
                            </span>
                          ) : (
                            <span className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-bold">
                              {percentage.toFixed(0)}% USED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

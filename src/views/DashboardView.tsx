import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import { CategoryIcon } from "../components/CategoryIcon.js";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  AlertTriangle,
  ChevronRight,
  PlusCircle,
  HelpCircle,
  CheckCircle,
  ArrowRight,
  PiggyBank
} from "lucide-react";
import { Link } from "react-router-dom";

export const DashboardView: React.FC = () => {
  const { api, user } = useAuth();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });
  const [trendChartType, setTrendChartType] = useState<"area" | "bar">("area");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/dashboard", {
        params: {
          year: activePeriod.year,
          month: activePeriod.month,
        }
      });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load dashboard statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activePeriod]);

  // Months lists
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getCurrencySymbol = (code: string) => {
    switch (code?.toUpperCase()) {
      case "EUR": return "€";
      case "GBP": return "£";
      case "INR": return "₹";
      case "JPY": return "¥";
      case "CAD": return "C$";
      default: return "$";
    }
  };

  const symbol = getCurrencySymbol(user?.currency || "USD");

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-semibold">Compiling real-time dashboard analytics...</p>
      </div>
    );
  }

  const financials = data?.financials || { total_income_this_month: 0, total_expenses_this_month: 0, balance_this_month: 0, cumulative_balance: 0 };
  const budget = data?.budget || { limit: 0, spent: 0, remaining: 0, percentage_used: 0 };
  const savings = data?.savings || { total_target: 0, total_saved: 0, percentage: 0, goals_count: 0 };
  const recentTransactions = data?.recent_transactions || [];
  const chartExpense = data?.charts?.expense_distribution || [];
  const chartTrends = data?.charts?.historical_trends || [];

  // Recharts color list for pie chart
  const PIE_COLORS = ["#0d9488", "#0284c7", "#4f46e5", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#6b7280"];

  const totalCategoryExpenses = chartExpense.reduce((sum: number, entry: any) => sum + entry.value, 0);
  const activeCategory = activeIndex !== null && chartExpense[activeIndex] ? chartExpense[activeIndex] : null;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-slate-900 text-2xl tracking-tight">Finances Overview</h2>
          <p className="text-slate-500 text-xs">Dynamic performance summaries for your cashflow and targets</p>
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

      {/* ==========================================
          KPI METRICS GRID
         ========================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Cumulative Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-full blur-2xl -z-10 group-hover:scale-110 transition-all" />
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Cumulative Balance</p>
          <p className="font-display font-extrabold text-2xl text-slate-900 mt-2 font-ledger">
            {symbol}{financials.cumulative_balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] font-semibold text-teal-600">
            <CheckCircle size={12} />
            <span>Net savings across all periods</span>
          </div>
        </div>

        {/* Metric 2: Monthly Income */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs relative overflow-hidden group">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Income (This Month)</p>
          <p className="font-display font-extrabold text-2xl text-emerald-600 mt-2 font-ledger">
            +{symbol}{financials.total_income_this_month.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 mt-3 text-[10px] font-medium text-slate-400">
            <TrendingUp size={12} className="text-emerald-500" />
            <span className="font-semibold text-slate-600">Total credited payments</span>
          </div>
        </div>

        {/* Metric 3: Monthly Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs relative overflow-hidden group">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Expenses (This Month)</p>
          <p className="font-display font-extrabold text-2xl text-rose-500 mt-2 font-ledger">
            -{symbol}{financials.total_expenses_this_month.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 mt-3 text-[10px] font-medium text-slate-400">
            <TrendingDown size={12} className="text-rose-400" />
            <span className="font-semibold text-slate-600">Total debited costs</span>
          </div>
        </div>

        {/* Metric 4: Net Cashflow */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs relative overflow-hidden group">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Net Monthly Cashflow</p>
          <p className={`font-display font-extrabold text-2xl mt-2 font-ledger ${financials.balance_this_month >= 0 ? "text-slate-900" : "text-rose-600"}`}>
            {financials.balance_this_month >= 0 ? "+" : ""}{symbol}{financials.balance_this_month.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] font-semibold text-slate-500">
            <div className={`w-1.5 h-1.5 rounded-full ${financials.balance_this_month >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
            <span>{financials.balance_this_month >= 0 ? "Retaining funds" : "Deficit spending alert"}</span>
          </div>
        </div>
      </div>

      {/* ==========================================
          LIMIT WARNING BUDGET CARD & TARGETS PROGRESS
         ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Active Budget Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Overall Monthly Budget</span>
              <span className="bg-teal-50 text-teal-700 font-bold px-2 py-0.5 rounded text-[10px]">
                {budget.percentage_used.toFixed(0)}% Used
              </span>
            </div>
            
            <div className="flex justify-between items-baseline mb-2">
              <h4 className="font-display font-extrabold text-slate-800 text-xl font-ledger">
                {symbol}{budget.spent.toFixed(2)} <span className="text-slate-400 text-xs font-normal">spent of {symbol}{budget.limit > 0 ? budget.limit.toFixed(2) : "0.00"}</span>
              </h4>
            </div>

            {/* Custom styled progress slider */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budget.percentage_used >= 100
                    ? "bg-rose-500"
                    : budget.percentage_used >= 80
                    ? "bg-amber-500"
                    : "bg-teal-600"
                }`}
                style={{ width: `${Math.min(100, budget.percentage_used)}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500 pt-2 border-t border-slate-100">
            <span>Remaining cashpool: <strong className="text-slate-800 font-ledger">{symbol}{budget.remaining.toFixed(2)}</strong></span>
            {budget.limit === 0 && (
              <Link to="/budgets" className="text-teal-600 hover:underline">Set Budget Limit</Link>
            )}
          </div>
        </div>

        {/* Savings Goals Aggregator */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Savings Progress</span>
              <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded text-[10px]">
                {savings.goals_count} Active Goal{savings.goals_count !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex justify-between items-baseline mb-2">
              <h4 className="font-display font-extrabold text-slate-800 text-xl font-ledger">
                {symbol}{savings.total_saved.toFixed(2)} <span className="text-slate-400 text-xs font-normal">saved of {symbol}{savings.total_target.toFixed(2)}</span>
              </h4>
            </div>

            {/* Progress line */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, savings.percentage)}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500 pt-2 border-t border-slate-100">
            <span>Overall Milestone: <strong className="text-slate-800">{savings.percentage.toFixed(1)}% complete</strong></span>
            <Link to="/savings" className="text-amber-600 hover:underline flex items-center gap-0.5">
              <span>View Milestones</span>
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* ==========================================
          CHARTING VISUAL ANALYTICS
         ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Cashflow 6-Month comparative area graph or side-by-side Grouped Bar Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-display font-bold text-slate-800 text-sm">Finances Trend History</h3>
              <p className="text-[10px] text-slate-400">Monthly credited cashflow vs debited expenses</p>
            </div>
            
            {/* Interactive Mode Control Buttons */}
            <div className="flex bg-slate-50 border border-slate-200 p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setTrendChartType("area")}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                  trendChartType === "area" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Area curve
              </button>
              <button
                type="button"
                onClick={() => setTrendChartType("bar")}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                  trendChartType === "bar" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Grouped bar
              </button>
            </div>
          </div>

          <div className="h-64 text-xs font-mono">
            {chartTrends.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                Insufficient monthly data to generate visual curves.
              </div>
            ) : trendChartType === "area" ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="monthName" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip formatter={(value) => [`${symbol}${value}`, ""]} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" name="Credited Income" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" name="Debited Expenses" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpenses)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="monthName" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip formatter={(value) => [`${symbol}${value}`, ""]} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar name="Credited Income" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar name="Debited Expenses" dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Interactive Category distribution Pie/Doughnut widget (Span 1) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-display font-bold text-slate-800 text-sm">Expense Sectors</h3>
            <p className="text-[10px] text-slate-400">Hover sectors to audit specific active month allocations</p>
          </div>

          <div className="h-44 flex items-center justify-center relative">
            {chartExpense.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-8">
                No expense records registered in active month.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartExpense}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                      onMouseEnter={(data, index) => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                    >
                      {chartExpense.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} className="cursor-pointer hover:opacity-90 outline-hidden" />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${symbol}${value}`} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center read-out layer */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                  {activeCategory ? (
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate max-w-[85px]">{activeCategory.name}</p>
                      <p className="text-sm font-extrabold text-slate-800 font-ledger">{symbol}{activeCategory.value.toFixed(0)}</p>
                      <p className="text-[9px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.2 rounded-full mt-0.5 inline-block">
                        {totalCategoryExpenses > 0 ? ((activeCategory.value / totalCategoryExpenses) * 100).toFixed(0) : 0}%
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Total spent</p>
                      <p className="text-sm font-extrabold text-slate-800 font-ledger">{symbol}{totalCategoryExpenses.toFixed(0)}</p>
                      <p className="text-[8px] text-slate-400 mt-0.5">Hover segment</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Pie legends list */}
          <div className="max-h-24 overflow-y-auto space-y-1.5 text-[11px] font-semibold text-slate-600">
            {chartExpense.slice(0, 3).map((item: any, idx: number) => (
              <div key={item.name} className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color || PIE_COLORS[idx % PIE_COLORS.length] }} />
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="font-ledger text-slate-800">{symbol}{item.value.toFixed(0)}</span>
              </div>
            ))}
            {chartExpense.length > 3 && (
              <p className="text-[10px] text-slate-400 text-center pt-1">+{chartExpense.length - 3} other categories</p>
            )}
          </div>
        </div>
      </div>

      {/* ==========================================
          RECENT TRANSACTIONS LEDGER LIST
         ========================================== */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-display font-bold text-slate-800 text-sm">Recent Activity Ledger</h3>
            <p className="text-[10px] text-slate-400">Combined audit trail of transaction history</p>
          </div>
          <Link
            to="/transactions"
            className="text-teal-600 hover:text-teal-700 text-xs font-bold flex items-center gap-0.5"
          >
            <span>Full History</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No active transactions logged in this period. Click the "+" button to begin!
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden">
            {recentTransactions.map((t: any) => {
              const isIncome = t.transaction_type === "income";
              return (
                <div key={`${t.transaction_type}-${t.id}`} className="py-3.5 flex items-center justify-between gap-4">
                  
                  {/* Left block (Category icon pill & title) */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: `${t.category_color}10` || "#f1f5f9",
                        borderColor: `${t.category_color}30` || "#e2e8f0",
                        color: t.category_color || "#64748b"
                      }}
                    >
                      <CategoryIcon name={t.category_icon || "Coins"} size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-slate-800 text-xs truncate">{t.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-slate-400 font-mono">{t.date}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 py-0.5 px-1.5 rounded">
                          {t.category_name || "Uncategorized"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right block (Amount value pill) */}
                  <div className="text-right shrink-0">
                    <span className={`font-ledger font-extrabold text-xs px-2.5 py-1 rounded-lg ${
                      isIncome
                        ? "text-emerald-700 bg-emerald-50/60"
                        : "text-slate-800 bg-slate-50"
                    }`}>
                      {isIncome ? "+" : "-"}{symbol}{t.amount.toFixed(2)}
                    </span>
                    {t.notes && (
                      <p className="text-[9px] text-slate-400 truncate max-w-[120px] mt-1 italic">{t.notes}</p>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

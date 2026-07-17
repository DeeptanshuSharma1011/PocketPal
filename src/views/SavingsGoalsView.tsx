import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import {
  PiggyBank,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  CheckCircle2,
  Target,
  Edit,
  ArrowRight,
  TrendingUp,
  Coins,
  X
} from "lucide-react";

export const SavingsGoalsView: React.FC = () => {
  const { api, user } = useAuth();

  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states: Creating
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentSavings, setCurrentSavings] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Form states: Updating Progress
  const [updatingGoal, setUpdatingGoal] = useState<any | null>(null);
  const [additionalSavings, setAdditionalSavings] = useState("");
  const [submittingProgress, setSubmittingProgress] = useState(false);

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

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await api.get("/savings-goals");
      if (res.data.success) {
        setGoals(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleSubmitGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetAmount || !deadline) {
      setFormError("Please fill in all mandatory goal fields.");
      return;
    }

    const target = parseFloat(targetAmount);
    const current = currentSavings ? parseFloat(currentSavings) : 0;

    if (isNaN(target) || target <= 0 || isNaN(current) || current < 0) {
      setFormError("Please enter valid positive numbers.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const res = await api.post("/savings-goals", {
        name: name.trim(),
        targetAmount: target,
        currentSavings: current,
        deadline,
      });

      if (res.data.success) {
        setName("");
        setTargetAmount("");
        setCurrentSavings("");
        setDeadline("");
        fetchGoals();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || "Goal configuration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingGoal || !additionalSavings) return;

    const amt = parseFloat(additionalSavings);
    if (isNaN(amt) || amt < 0) {
      alert("Please enter a valid non-negative value.");
      return;
    }

    setSubmittingProgress(true);

    try {
      // API accepts 'currentSavings' as an update update payload
      const res = await api.put(`/savings-goals/${updatingGoal.id}`, {
        currentSavings: amt, // Sets the absolute current savings
      });

      if (res.data.success) {
        setUpdatingGoal(null);
        setAdditionalSavings("");
        fetchGoals();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to adjust savings.");
    } finally {
      setSubmittingProgress(false);
    }
  };

  const handleDeleteGoal = async (id: number) => {
    if (confirm("Permanently erase this savings goal?")) {
      try {
        await api.delete(`/savings-goals/${id}`);
        fetchGoals();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER */}
      <div>
        <h2 className="font-display font-extrabold text-slate-900 text-2xl tracking-tight">Savings Goals</h2>
        <p className="text-slate-500 text-xs">Set milestones for big purchases, emergencies, or investments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: CREATE GOAL FORM */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs h-fit space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
              <PiggyBank size={16} />
            </div>
            <h3 className="font-display font-bold text-slate-800 text-sm">Create New Target</h3>
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-medium animate-pulse">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmitGoal} className="space-y-4 text-xs">
            {/* Goal Title */}
            <div className="space-y-1">
              <label className="block font-semibold text-slate-600">Goal Description / Title</label>
              <input
                type="text"
                required
                placeholder="e.g. MacBook Pro, Rainy Day Fund, Vacation..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl py-2 px-3 text-slate-800 outline-hidden"
              />
            </div>

            {/* Target & Current Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-semibold text-slate-600">Target Goal ({symbol})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="2000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl py-2 px-3 text-slate-800 font-mono outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-600">Start Savings ({symbol})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={currentSavings}
                  onChange={(e) => setCurrentSavings(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl py-2 px-3 text-slate-800 font-mono outline-hidden"
                />
              </div>
            </div>

            {/* Target Deadline */}
            <div className="space-y-1">
              <label className="block font-semibold text-slate-600">Target Deadline</label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl py-2 px-3 text-slate-800 outline-hidden"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white py-2.5 rounded-xl font-semibold shadow-md shadow-amber-500/10 transition-all flex items-center justify-center cursor-pointer"
            >
              {submitting ? "Processing..." : "Secure Target Allocation"}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: ACTIVE GOALS CARDS LIST (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
            <h3 className="font-display font-bold text-slate-800 text-sm">Active Milestones</h3>
            <p className="text-[10px] text-slate-400">Track and manage incremental payments on your big objectives</p>
          </div>

          {loading ? (
            <div className="text-center py-16 bg-white rounded-2xl border">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Analyzing milestone records...</p>
            </div>
          ) : goals.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/60 border-dashed">
              <p className="text-xs text-slate-400 font-semibold">No savings targets created yet.</p>
              <p className="text-[10px] text-slate-400 mt-1">Configure your first big objective using the left form panel!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {goals.map((g) => {
                const percentage = g.progress_percentage || 0;
                const achieved = percentage >= 100;

                return (
                  <div key={g.id} className="bg-white p-5 rounded-2xl border border-slate-200/60 hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group">
                    {/* Decorative achieved watermark */}
                    {achieved && (
                      <div className="absolute -top-6 -right-6 w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center rotate-45 shrink-0 opacity-15">
                        <Sparkles size={16} />
                      </div>
                    )}

                    {/* Top block */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <h4 className="font-display font-extrabold text-slate-800 text-sm truncate">{g.name}</h4>
                          <span className="text-[9px] text-slate-400 font-mono block mt-0.5 flex items-center gap-1">
                            <Calendar size={10} />
                            <span>Deadline: {g.deadline}</span>
                          </span>
                        </div>
                        
                        <button
                          onClick={() => handleDeleteGoal(g.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Erase milestone target"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Cash sums */}
                      <div className="pt-2 flex justify-between items-baseline text-xs font-semibold text-slate-500">
                        <span>Saved: <strong className="text-slate-800 font-ledger">{symbol}{g.current_savings.toFixed(2)}</strong></span>
                        <span>Target: <strong className="text-slate-500 font-ledger">{symbol}{g.target_amount.toFixed(2)}</strong></span>
                      </div>

                      {/* Progress meter */}
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            achieved ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer stats / Actions */}
                    <div className="flex items-center justify-between text-[11px] font-semibold pt-3 border-t border-slate-100">
                      {achieved ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 font-bold">
                          <CheckCircle2 size={11} />
                          <span>ACHIEVED! ({percentage.toFixed(0)}%)</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 font-ledger">
                          {percentage.toFixed(0)}% Complete
                        </span>
                      )}

                      <button
                        onClick={() => handleEditInit(g)}
                        className="text-amber-600 hover:text-amber-700 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <Edit size={11} />
                        <span>Update Savings</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ==========================================
          UPDATE SAVINGS INCREMENT MODAL OVERLAY
         ========================================== */}
      {updatingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setUpdatingGoal(null)} />
          
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden z-10 animate-slide-up">
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center">
              <div>
                <h3 className="font-display font-semibold text-slate-900 text-sm">Increment Ledger Progress</h3>
                <p className="text-[10px] text-slate-400">Target Name: "{updatingGoal.name}"</p>
              </div>
              <button onClick={() => setUpdatingGoal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateProgress} className="p-6 space-y-4">
              <div className="space-y-1 text-xs">
                <label className="block font-semibold text-slate-600">
                  Total Saved Value ({symbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder={updatingGoal.current_savings.toString()}
                  value={additionalSavings}
                  onChange={(e) => setAdditionalSavings(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl py-2.5 px-3 text-slate-800 font-mono outline-hidden"
                />
                <p className="text-[9px] text-slate-400 leading-normal pt-1">
                  Adjusting this changes your absolute total saved amount from <strong>{symbol}{updatingGoal.current_savings.toFixed(2)}</strong> to your input.
                </p>
              </div>

              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setUpdatingGoal(null)}
                  className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 py-2 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProgress}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-xl font-semibold transition-all"
                >
                  {submittingProgress ? "Saving..." : "Update Progress"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );

  function handleEditInit(goal: any) {
    setUpdatingGoal(goal);
    setAdditionalSavings(goal.current_savings.toString());
  }
};

import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import { X, Calendar, Wallet, Tag, FileText, Sparkles, Upload, Image as ImageIcon, Trash2 } from "lucide-react";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { api } = useAuth();
  
  const [type, setType] = useState<"expense" | "income">("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Card");
  const [receiptScreenshot, setReceiptScreenshot] = useState("");
  
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      // Reset inputs
      setTitle("");
      setAmount("");
      setNotes("");
      setReceiptScreenshot("");
      setPaymentMethod("Card");
      setDate(new Date().toISOString().split("T")[0]);
      setErrorMsg("");
    }
  }, [isOpen, type]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories");
      if (res.data.success) {
        // Filter by active transaction type
        const filtered = res.data.data.filter((c: any) => c.type === type);
        setCategories(filtered);
        if (filtered.length > 0) {
          setCategoryId(filtered[0].id.toString());
        } else {
          setCategoryId("");
        }
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || !date) {
      setErrorMsg("Please fill in all mandatory fields.");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Please enter a valid positive amount.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      if (type === "expense") {
        await api.post("/expenses", {
          title: title.trim(),
          amount: parsedAmount,
          categoryId: categoryId ? parseInt(categoryId, 10) : null,
          paymentMethod,
          date,
          notes: notes.trim() || undefined,
          receiptScreenshot: receiptScreenshot.trim() || undefined,
        });
      } else {
        await api.post("/income", {
          source: title.trim(),
          amount: parsedAmount,
          categoryId: categoryId ? parseInt(categoryId, 10) : null,
          date,
          notes: notes.trim() || undefined,
          receiptScreenshot: receiptScreenshot.trim() || undefined,
        });
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || "Transaction submission failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Canvas */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden z-10 animate-slide-up">
        {/* Banner */}
        <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 text-sm">Quick Record Entry</h3>
              <p className="text-[10px] text-slate-400">Add a new financial transaction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Segmented Type Toggle */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                type === "expense"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Expense Debit
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                type === "income"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Income Credit
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-3">
            {/* Title / Source */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {type === "expense" ? "Expense Title" : "Income Source"} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder={type === "expense" ? "Grocery run, Uber ride..." : "Salary, Freelance payout..."}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2 px-3 text-xs text-slate-800 outline-hidden transition-all"
                />
              </div>
            </div>

            {/* Amount & Date Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Amount <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2 px-3 text-xs text-slate-800 font-mono outline-hidden transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Transaction Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2 px-3 text-xs text-slate-800 outline-hidden transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Category and Payment Method Selection */}
            {type === "expense" ? (
              <div className="grid grid-cols-2 gap-3">
                {categories.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Classification Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2 px-3 text-xs text-slate-800 outline-hidden transition-all"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2 px-3 text-xs text-slate-800 outline-hidden transition-all"
                  >
                    <option value="Card">Card / Debit</option>
                    <option value="Cash">Physical Cash</option>
                    <option value="Bank Transfer">Wire Transfer</option>
                    <option value="Mobile Payment">Mobile/Apple Pay</option>
                    <option value="Auto Debit">Auto Debit / Billing</option>
                  </select>
                </div>
              </div>
            ) : (
              categories.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Classification Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2 px-3 text-xs text-slate-800 outline-hidden transition-all"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )
            )}

            {/* Receipt Screenshot Attachment Section */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Receipt Attachment (Optional)</span>
              
              <div>
                {receiptScreenshot ? (
                  <div className="relative border border-slate-200 rounded-lg bg-white p-2.5 flex items-center justify-between h-[38px] shadow-xs">
                    <div className="flex items-center gap-2 truncate">
                      <ImageIcon size={14} className="text-teal-600 shrink-0" />
                      <span className="text-[11px] font-medium text-slate-600 truncate">Receipt Screenshot Attached</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReceiptScreenshot("")}
                      className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg transition-all cursor-pointer inline-flex"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-teal-500 rounded-lg h-[38px] bg-white cursor-pointer hover:bg-teal-50/20 transition-all shadow-xs">
                    <Upload size={14} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600">Upload Receipt Screenshot Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Transaction Notes
              </label>
              <textarea
                placeholder="Add shopping items description, billing reference..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2 px-3 text-xs text-slate-800 outline-hidden resize-none transition-all"
              />
            </div>
          </div>

          {/* Submit Trigger */}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-teal-600/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              {loading ? "Recording..." : "Save Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

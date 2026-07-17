import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import { CategoryIcon } from "../components/CategoryIcon.js";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  RefreshCw,
  PlusCircle,
  X,
  FileSpreadsheet,
  AlertCircle,
  Upload,
  Image as ImageIcon
} from "lucide-react";

export const TransactionsView: React.FC = () => {
  const { api, user } = useAuth();

  // Active view: "expenses" | "income" | "trash"
  const [activeTab, setActiveTab] = useState<"expenses" | "income" | "trash">("expenses");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Custom Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categories, setCategories] = useState<any[]>([]);

  // Editing state
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editReceiptScreenshot, setEditReceiptScreenshot] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Lightbox preview state
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 10;

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

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories");
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const endpoint = activeTab === "income" ? "/income" : "/expenses";
      const params: any = {
        limit,
        offset: (page - 1) * limit,
        search: searchQuery.trim() || undefined,
        categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        includeDeleted: activeTab === "trash" ? true : false,
      };

      const res = await api.get(endpoint, { params });
      if (res.data.success) {
        let rows = res.data.data;
        if (activeTab === "trash") {
          // Filter specifically to soft deleted entries across income or expenses
          // As our PostgreSQL repositories support includeDeleted, let's filter rows where is_soft_deleted is true
          rows = rows.filter((r: any) => r.is_soft_deleted === true || r.is_soft_deleted === 1);
        }
        setRecords(rows);
        setTotalRecords(res.data.meta?.total || rows.length);
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
    setPage(1); // reset page on filter change
    fetchTransactions();
  }, [activeTab, searchQuery, categoryId, startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  const handleEditInit = (record: any) => {
    setEditingRecord(record);
    setEditTitle(record.title || record.source || "");
    setEditAmount(record.amount.toString());
    setEditCategoryId(record.category_id?.toString() || "");
    setEditDate(record.date || "");
    setEditNotes(record.notes || "");
    setEditPaymentMethod(record.payment_method || "Card");
    setEditReceiptScreenshot(record.receipt_screenshot || "");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditReceiptScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    setSavingEdit(true);
    const endpoint = activeTab === "income" ? `/income/${editingRecord.id}` : `/expenses/${editingRecord.id}`;
    
    try {
      const payload: any = {
        amount: parseFloat(editAmount),
        categoryId: editCategoryId ? parseInt(editCategoryId, 10) : null,
        date: editDate,
        notes: editNotes.trim(),
        receiptScreenshot: editReceiptScreenshot.trim() || null,
      };

      if (activeTab === "income") {
        payload.source = editTitle.trim();
      } else {
        payload.title = editTitle.trim();
        payload.paymentMethod = editPaymentMethod;
      }

      await api.put(endpoint, payload);
      setEditingRecord(null);
      fetchTransactions();
    } catch (err) {
      console.error(err);
      alert("Failed to save changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSoftDelete = (id: number) => {
    const endpoint = activeTab === "income" ? `/income/${id}` : `/expenses/${id}`;
    setConfirmModal({
      isOpen: true,
      title: "Move to Trash",
      message: "Are you sure you want to move this transaction to Trash? You can restore it later from the Trash tab.",
      onConfirm: async () => {
        try {
          await api.delete(endpoint);
          fetchTransactions();
        } catch (err) {
          console.error(err);
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleRestore = async (id: number, type: "income" | "expense") => {
    const endpoint = type === "income" ? `/income/${id}/restore` : `/expenses/${id}/restore`;
    try {
      await api.put(endpoint);
      fetchTransactions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleHardDelete = (id: number, type: "income" | "expense") => {
    const endpoint = type === "income" ? `/income/${id}/hard` : `/expenses/${id}/hard`;
    setConfirmModal({
      isOpen: true,
      title: "Permanently Delete",
      message: "Permanently erase this record? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await api.delete(endpoint);
          fetchTransactions();
        } catch (err) {
          console.error(err);
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // CSV Exporter
  const handleExportCSV = () => {
    if (records.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type,Title/Source,Amount,Category,Payment Method,Date,Notes\r\n";

    records.forEach((r) => {
      const typeStr = activeTab === "income" ? "Income" : "Expense";
      const titleStr = r.title || r.source || "";
      const amt = r.amount;
      const cat = r.category_name || "Uncategorized";
      const pay = r.payment_method || "N/A";
      const dt = r.date || "";
      const nt = (r.notes || "").replace(/,/g, ";"); // prevent csv breakdown

      csvContent += `"${typeStr}","${titleStr}",${amt},"${cat}","${pay}","${dt}","${nt}"\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pocketpal_ledger_${activeTab}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCategories = categories.filter((c) => {
    if (activeTab === "trash") return true;
    return c.type === activeTab;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-slate-900 text-2xl tracking-tight font-display">Activity Ledgers</h2>
          <p className="text-slate-500 text-xs">Search, categorize, edit, or purge financial logs</p>
        </div>

        {/* Export Button */}
        {records.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="self-start sm:self-auto bg-white border border-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl text-xs flex items-center gap-2 hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            <Download size={14} className="text-teal-600" />
            <span>Export to CSV Spreadsheet</span>
          </button>
        )}
      </div>

      {/* SEGMENTED TAB TOGGLE CONTROLS */}
      <div className="flex p-1 bg-slate-100 rounded-xl max-w-md">
        <button
          onClick={() => setActiveTab("expenses")}
          className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "expenses" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Expense Limits
        </button>
        <button
          onClick={() => setActiveTab("income")}
          className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "income" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Income Credits
        </button>
        <button
          onClick={() => setActiveTab("trash")}
          className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "trash" ? "bg-rose-50 text-rose-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Archive Trash
        </button>
      </div>

      {/* FILTER CONTROLS GRID */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Search details, merchant, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-xs text-slate-800 outline-hidden focus:border-teal-500 transition-all"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-700 outline-hidden focus:border-teal-500 cursor-pointer"
        >
          <option value="">All Categories</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Start Date */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase select-none">From</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent border-0 p-0 text-xs text-slate-700 outline-hidden cursor-pointer focus:ring-0 focus:outline-hidden w-full"
          />
        </div>

        {/* End Date */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase select-none">To</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent border-0 p-0 text-xs text-slate-700 outline-hidden cursor-pointer focus:ring-0 focus:outline-hidden w-full"
          />
        </div>
      </div>

      {/* LEDGER DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {loading ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading ledger logs...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3 border">
              <AlertCircle size={20} />
            </div>
            <h4 className="font-display font-semibold text-slate-800 text-sm">No transactions found</h4>
            <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
              We couldn't locate any matching financial rows. Clear active filters, switch tabs, or tap the quick-add floating action trigger.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Ledger Table (hidden on mobile screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-5">Details / Category</th>
                    <th className="py-3 px-5">Amount</th>
                    <th className="py-3 px-5">Date</th>
                    <th className="py-3 px-5 hidden md:table-cell">Details / Notes</th>
                    <th className="py-3 px-5 hidden md:table-cell">Payment</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((r) => {
                    const titleStr = r.title || r.source || "Unspecified";
                    const isExpense = activeTab === "expenses" || r.payment_method;
                    return (
                      <tr key={`${activeTab}-${r.id}`} className="hover:bg-slate-50/50 transition-colors">
                        {/* Name / Category */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                              style={{
                                backgroundColor: `${r.category_color}10` || "#f1f5f9",
                                borderColor: `${r.category_color}30` || "#e2e8f0",
                                color: r.category_color || "#475569"
                              }}
                            >
                              <CategoryIcon name={r.category_icon || "Coins"} size={14} />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-display font-bold text-slate-800">{titleStr}</p>
                                {r.receipt_screenshot && (
                                  <button
                                    type="button"
                                    onClick={() => setViewingScreenshot(r.receipt_screenshot)}
                                    className="text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer inline-flex items-center gap-0.5"
                                    title="View Receipt Screenshot"
                                  >
                                    <ImageIcon size={9} />
                                    <span>Receipt</span>
                                  </button>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                {r.category_name || "Uncategorized"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-5 font-ledger font-extrabold text-[13px]">
                          <span className={isExpense ? "text-slate-800" : "text-emerald-600"}>
                            {isExpense ? "-" : "+"}{symbol}{r.amount.toFixed(2)}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-5 text-slate-500 font-mono">{r.date}</td>

                        {/* Notes */}
                        <td className="py-3.5 px-5 text-slate-400 hidden md:table-cell max-w-[200px] truncate italic">
                          {r.notes || "—"}
                        </td>

                        {/* Payment Method */}
                        <td className="py-3.5 px-5 hidden md:table-cell">
                          {r.payment_method ? (
                            <span className="bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded text-[10px]">
                              {r.payment_method}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right space-x-1 whitespace-nowrap">
                          {activeTab === "trash" ? (
                            <>
                              {/* Trash Action 1: Restore */}
                              <button
                                onClick={() => handleRestore(r.id, r.source ? "income" : "expense")}
                                className="text-teal-600 hover:text-teal-700 font-semibold text-[11px] bg-teal-50 hover:bg-teal-100 py-1 px-2.5 rounded-md cursor-pointer"
                              >
                                Restore
                              </button>
                              {/* Trash Action 2: Hard Delete */}
                              <button
                                onClick={() => handleHardDelete(r.id, r.source ? "income" : "expense")}
                                className="text-rose-600 hover:text-rose-700 font-semibold text-[11px] bg-rose-50 hover:bg-rose-100 py-1 px-2.5 rounded-md cursor-pointer"
                              >
                                Erase
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Standard edit/delete */}
                              <button
                                onClick={() => handleEditInit(r)}
                                className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-lg cursor-pointer inline-flex"
                                title="Edit Transaction"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleSoftDelete(r.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg cursor-pointer inline-flex"
                                title="Move to Trash"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Swipeable Ledger Deck */}
            <div className="block md:hidden divide-y divide-slate-100 bg-white">
              <AnimatePresence initial={false}>
                {records.map((r) => {
                  const titleStr = r.title || r.source || "Unspecified";
                  const isExpense = activeTab === "expenses" || r.payment_method;

                  return (
                    <div key={`${activeTab}-mobile-${r.id}`} className="relative overflow-hidden bg-slate-50">
                      {/* Swipe Underlay Action (Trash Red Highlight) */}
                      <div className="absolute inset-y-0 right-0 w-[100px] bg-rose-600 flex items-center justify-center text-white font-bold text-xs gap-1">
                        <Trash2 size={15} />
                        <span>Archive</span>
                      </div>

                      <motion.div
                        drag="x"
                        dragConstraints={{ left: -100, right: 0 }}
                        dragElastic={0.15}
                        onDragEnd={(event, info) => {
                          if (info.offset.x < -60) {
                            if (activeTab === "trash") {
                              handleHardDelete(r.id, r.source ? "income" : "expense");
                            } else {
                              handleSoftDelete(r.id);
                            }
                          }
                        }}
                        className="relative bg-white p-4 flex items-center justify-between gap-3 shadow-xs active:bg-slate-50 transition-colors border-b border-slate-100 z-10"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                            style={{
                              backgroundColor: `${r.category_color}10` || "#f1f5f9",
                              borderColor: `${r.category_color}30` || "#e2e8f0",
                              color: r.category_color || "#475569"
                            }}
                          >
                            <CategoryIcon name={r.category_icon || "Coins"} size={15} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-display font-bold text-slate-800 text-xs truncate max-w-[130px]">{titleStr}</p>
                              {r.receipt_screenshot && (
                                <button
                                  type="button"
                                  onClick={() => setViewingScreenshot(r.receipt_screenshot)}
                                  className="text-teal-600 hover:text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer inline-flex items-center gap-0.5"
                                >
                                  <ImageIcon size={8} />
                                  <span>Receipt</span>
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-slate-400 font-semibold">
                              <span>{r.category_name || "Uncategorized"}</span>
                              <span>•</span>
                              <span className="font-mono">{r.date}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <p className={`font-ledger font-extrabold text-xs ${isExpense ? "text-slate-800" : "text-emerald-600"}`}>
                              {isExpense ? "-" : "+"}{symbol}{r.amount.toFixed(2)}
                            </p>
                            {r.payment_method && (
                              <span className="bg-slate-100 text-slate-500 font-semibold px-1 py-0.2 rounded text-[8px]">
                                {r.payment_method}
                              </span>
                            )}
                          </div>

                          <div className="flex gap-1">
                            {activeTab === "trash" ? (
                              <button
                                onClick={() => handleRestore(r.id, r.source ? "income" : "expense")}
                                className="text-[10px] text-teal-600 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded font-bold cursor-pointer"
                              >
                                Restore
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditInit(r)}
                                  className="p-1 text-slate-400 hover:text-teal-600 cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => handleSoftDelete(r.id)}
                                  className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                                  title="Move to Trash"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* PAGINATION PANEL FOOTER */}
        {!loading && totalRecords > limit && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/50">
            <span className="text-slate-400">
              Showing page <strong>{page}</strong> of {Math.ceil(totalRecords / limit)}
            </span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="py-1 px-3 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg disabled:opacity-50 text-slate-600 font-semibold cursor-pointer"
              >
                Prev
              </button>
              <button
                disabled={page >= Math.ceil(totalRecords / limit)}
                onClick={() => setPage(page + 1)}
                className="py-1 px-3 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg disabled:opacity-50 text-slate-600 font-semibold cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          EDIT RECORD SLIDEOUT / MODAL OVERLAY
         ========================================== */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setEditingRecord(null)} />
          
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden z-10 animate-slide-up">
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center">
              <h3 className="font-display font-semibold text-slate-900 text-sm">Update Record Details</h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {/* Title / Source */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Title / Name
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2 px-3 text-xs text-slate-800 outline-hidden"
                />
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2 px-3 text-xs text-slate-800 outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2 px-3 text-xs text-slate-800 outline-hidden"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2 px-3 text-xs text-slate-800 outline-hidden"
                >
                  <option value="">Uncategorized</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Expense Specific Settings */}
              {activeTab === "expenses" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Method</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2 px-3 text-xs text-slate-800 outline-hidden"
                  >
                    <option value="Card">Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Transfer</option>
                    <option value="Mobile Payment">Mobile Pay</option>
                  </select>
                </div>
              )}

              {/* Receipt Screenshot Section */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Receipt Attachment (Optional)</span>
                
                <div>
                  {editReceiptScreenshot ? (
                    <div className="relative border border-slate-200 rounded-lg bg-white p-2 flex items-center justify-between h-[36px] shadow-xs">
                      <div className="flex items-center gap-2 truncate">
                        <ImageIcon size={14} className="text-teal-600 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-600 truncate max-w-[200px]">Screenshot Attached</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditReceiptScreenshot("")}
                        className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg transition-all cursor-pointer inline-flex"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-teal-500 rounded-lg h-[36px] bg-white cursor-pointer hover:bg-teal-50/20 transition-all shadow-xs">
                      <Upload size={14} className="text-slate-400" />
                      <span className="text-xs font-semibold text-slate-600">Upload Receipt Screenshot</span>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Memo</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl py-2 px-3 text-xs text-slate-800 outline-hidden resize-none"
                />
              </div>

              {/* Save triggers */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2 rounded-xl text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-xl text-xs font-semibold shadow-md shadow-teal-600/10 transition-all"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          CUSTOM DIALOG CONFIRMATION MODAL
         ========================================== */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />
          
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden z-10 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0 border border-amber-100">
                <AlertCircle size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-semibold text-slate-900 text-sm">{confirmModal.title}</h4>
                <p className="text-slate-500 text-xs leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>

            <div className="flex gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-1.5 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="bg-rose-600 hover:bg-rose-700 text-white py-1.5 px-4 rounded-xl text-xs font-semibold shadow-md shadow-rose-600/10 transition-all cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          LIGHTBOX RECEIPT SCREENSHOT PREVIEW MODAL
         ========================================== */}
      {viewingScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs" onClick={() => setViewingScreenshot(null)} />
          
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden z-10 p-5 space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-display font-semibold text-slate-900 text-sm">Receipt Screenshot Attachment</h4>
              <button
                onClick={() => setViewingScreenshot(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl overflow-hidden p-3 min-h-[250px] max-h-[60vh]">
              <img
                src={viewingScreenshot}
                alt="Receipt screenshot attachment"
                className="max-h-[50vh] max-w-full object-contain rounded-lg shadow-xs"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setViewingScreenshot(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1.5 px-4 rounded-xl text-xs transition-all cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

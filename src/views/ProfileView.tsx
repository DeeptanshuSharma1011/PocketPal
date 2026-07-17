import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.js";
import { CategoryIcon } from "../components/CategoryIcon.js";
import {
  User,
  Key,
  Database,
  Lock,
  Plus,
  Trash2,
  ListChecks,
  Briefcase,
  AlertCircle,
  Clock,
  Settings,
  Sparkles
} from "lucide-react";

const AVATAR_PRESETS = [
  { id: "cat", label: "Cat", url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150&auto=format&fit=crop&q=80" },
  { id: "dog", label: "Dog", url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&auto=format&fit=crop&q=80" },
  { id: "rabbit", label: "Rabbit", url: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=150&auto=format&fit=crop&q=80" },
  { id: "robot", label: "Robot", url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=150&auto=format&fit=crop&q=80" },
  { id: "flower", label: "Flower", url: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=150&auto=format&fit=crop&q=80" },
  { id: "galaxy", label: "Galaxy", url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=150&auto=format&fit=crop&q=80" },
  { id: "male_1", label: "Gentleman", url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80" },
  { id: "male_2", label: "Classic", url: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&auto=format&fit=crop&q=80" },
  { id: "male_3", label: "Retro", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
  { id: "female_1", label: "Creative", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
  { id: "female_2", label: "Minimalist", url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80" },
  { id: "female_3", label: "Vibrant", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" }
];

export const ProfileView: React.FC = () => {
  const { api, user, updateUser, logout } = useAuth();

  // Settings states
  const [name, setName] = useState(user?.name || "");
  const [monthlyIncome, setMonthlyIncome] = useState(user?.monthly_income?.toString() || "");
  const [currency, setCurrency] = useState(user?.currency || "USD");
  const [profilePicture, setProfilePicture] = useState(user?.profile_picture || "");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordErr, setPasswordErr] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Custom Categories states
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"expense" | "income">("expense");
  const [newCatIcon, setNewCatIcon] = useState("Coins");
  const [newCatColor, setNewCatColor] = useState("#0d9488");
  const [categoryMsg, setCategoryMsg] = useState("");
  const [categoryErr, setCategoryErr] = useState("");

  // Activity log states
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

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

  const fetchActivityLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.get("/activity-logs");
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchActivityLogs();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg("");
    setProfileErr("");

    try {
      const res = await api.put("/profile", {
        name: name.trim(),
        monthlyIncome: parseFloat(monthlyIncome) || 0,
        currency,
        profilePicture: profilePicture.trim() || null,
      });

      if (res.data.success) {
        updateUser(res.data.data);
        setProfileMsg("Workspace settings saved successfully!");
        setTimeout(() => setProfileMsg(""), 3000);
      }
    } catch (err: any) {
      setProfileErr(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordErr("New passwords do not match.");
      return;
    }

    setChangingPassword(true);
    setPasswordMsg("");
    setPasswordErr("");

    try {
      const res = await api.put("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      if (res.data.success) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordMsg("Password changed successfully!");
        setTimeout(() => setPasswordMsg(""), 3000);
      }
    } catch (err: any) {
      setPasswordErr(err.response?.data?.error || "Failed to change credentials.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setCategoryErr("Please enter a category name.");
      return;
    }

    setCategoryMsg("");
    setCategoryErr("");

    try {
      const res = await api.post("/categories", {
        name: newCatName.trim(),
        type: newCatType,
        icon: newCatIcon,
        color: newCatColor,
      });

      if (res.data.success) {
        setNewCatName("");
        setCategoryMsg("Custom category created successfully!");
        fetchCategories();
        setTimeout(() => setCategoryMsg(""), 3000);
      }
    } catch (err: any) {
      setCategoryErr(err.response?.data?.error || "Category creation failed.");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (confirm("Move all associated transactions to 'Uncategorized' and erase this custom category? Defaults cannot be deleted.")) {
      try {
        await api.delete(`/categories/${id}`);
        fetchCategories();
      } catch (err: any) {
        alert(err.response?.data?.error || "Deletion restricted.");
      }
    }
  };

  // Mock icons list for dropdown
  const ICON_PRESETS = [
    "Coins", "Utensils", "ShoppingBag", "Bus", "Home", "Wifi",
    "HeartPulse", "Lightbulb", "GraduationCap", "Cpu", "Car",
    "Coffee", "Smartphone", "PiggyBank", "Gift", "Briefcase"
  ];

  const COLOR_PRESETS = [
    "#0d9488", "#0284c7", "#4f46e5", "#8b5cf6", "#ec4899",
    "#f43f5e", "#f97316", "#eab308", "#10b981", "#64748b"
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* HEADER */}
      <div>
        <h2 className="font-display font-extrabold text-slate-900 text-2xl tracking-tight">System Settings</h2>
        <p className="text-slate-500 text-xs">Configure preferences, design custom categories, and check audit security logs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SECTION 1: PROFILE PREFERENCES */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center">
              <Settings size={16} />
            </div>
            <h3 className="font-display font-bold text-slate-800 text-sm">Personal Profile</h3>
          </div>

          {profileMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl font-medium">
              {profileMsg}
            </div>
          )}

          {profileErr && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-medium">
              {profileErr}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            {/* Name */}
            <div className="space-y-1">
              <label className="block font-semibold text-slate-600">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl py-2 px-3 text-slate-800 outline-hidden"
              />
            </div>

            {/* Income */}
            <div className="space-y-1">
              <label className="block font-semibold text-slate-600">Monthly Estimated Income</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl py-2 px-3 text-slate-800 font-mono outline-hidden"
              />
            </div>

            {/* Currency */}
            <div className="space-y-1">
              <label className="block font-semibold text-slate-600">Default Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl py-2 px-3 text-slate-800 outline-hidden cursor-pointer"
              >
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="JPY">JPY (¥) - Japanese Yen</option>
                <option value="CAD">CAD (C$) - Canadian Dollar</option>
              </select>
            </div>

            {/* Avatar Preset Selector */}
            <div className="space-y-2">
              <label className="block font-semibold text-slate-600">Workspace Avatar</label>
              
              {/* Current Selection Preview */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-teal-200 shadow-xs shrink-0 bg-teal-50/55 flex items-center justify-center font-bold text-sm">
                  {profilePicture ? (
                    <img src={profilePicture} alt="Selected Avatar" className="w-full h-full object-cover" />
                  ) : (
                    name.charAt(0).toUpperCase() || "P"
                  )}
                </div>
                <div>
                  <p className="font-display font-bold text-slate-800 text-[11px] leading-tight">Current Selection</p>
                  <p className="text-slate-400 text-[10px]">Select any preset avatar from the gallery below</p>
                </div>
              </div>

              {/* Grid of presets */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {AVATAR_PRESETS.map((preset) => {
                  const isSelected = profilePicture === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setProfilePicture(preset.url)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all p-0.5 bg-slate-50 cursor-pointer ${
                        isSelected 
                          ? "border-teal-500 ring-2 ring-teal-500/10 shadow-sm scale-102" 
                          : "border-slate-100 hover:border-slate-200 hover:bg-slate-100/50"
                      }`}
                      title={preset.label}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover rounded-lg" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-teal-500/10 flex items-center justify-center">
                          <div className="w-4 h-4 bg-teal-600 rounded-full flex items-center justify-center text-white text-[8px] font-bold">
                            ✓
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-2.5 rounded-xl font-semibold shadow-md shadow-teal-600/10 transition-all cursor-pointer"
            >
              {savingProfile ? "Saving..." : "Save Workspace Profile"}
            </button>
          </form>
        </div>

        {/* SECTION 2: PASSWORD SETTINGS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
              <Lock size={16} />
            </div>
            <h3 className="font-display font-bold text-slate-800 text-sm">Security Password</h3>
          </div>

          {passwordMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl font-medium">
              {passwordMsg}
            </div>
          )}

          {passwordErr && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-medium animate-pulse">
              {passwordErr}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            {/* Current Password */}
            <div className="space-y-1">
              <label className="block font-semibold text-slate-600">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl py-2 px-3 text-slate-800 outline-hidden"
              />
            </div>

            {/* New Password */}
            <div className="space-y-1">
              <label className="block font-semibold text-slate-600">New Secure Password</label>
              <input
                type="password"
                required
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl py-2 px-3 text-slate-800 outline-hidden"
              />
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1">
              <label className="block font-semibold text-slate-600">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl py-2 px-3 text-slate-800 outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white py-2.5 rounded-xl font-semibold shadow-md shadow-rose-600/10 transition-all cursor-pointer"
            >
              {changingPassword ? "Updating Credentials..." : "Refactor Password"}
            </button>
          </form>
        </div>

        {/* SECTION 3: CATEGORY CUSTOMIZATION MANAGER */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4 h-fit">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <h3 className="font-display font-bold text-slate-800 text-sm">Category Customizer</h3>
          </div>

          {categoryMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl font-medium">
              {categoryMsg}
            </div>
          )}

          {categoryErr && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-medium">
              {categoryErr}
            </div>
          )}

          {/* Inline Form */}
          <form onSubmit={handleCreateCategory} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="Dine Out, Subscriptions..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl py-1.5 px-3 text-slate-800 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Type</label>
                <select
                  value={newCatType}
                  onChange={(e) => setNewCatType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl py-1.5 px-2 text-slate-800 outline-hidden cursor-pointer"
                >
                  <option value="expense">Expense Debit</option>
                  <option value="income">Income Credit</option>
                </select>
              </div>
            </div>

            {/* Icon & Color Presets selector */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Icon</label>
                <select
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2 text-slate-800 cursor-pointer"
                >
                  {ICON_PRESETS.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Select Color</label>
                <div className="flex flex-wrap gap-1 items-center pt-1.5">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCatColor(color)}
                      className={`w-4.5 h-4.5 rounded-full border transition-all cursor-pointer shrink-0 ${
                        newCatColor === color ? "ring-2 ring-slate-800 border-white scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-xl font-semibold shadow-md shadow-amber-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Classification</span>
            </button>
          </form>
        </div>

      </div>

      {/* SECTION 4: FULL AUDIT SECURITY ACTIVITY LOG (Full Width Row) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
            <ListChecks size={16} />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-800 text-sm">Security Audit Logs</h3>
            <p className="text-[10px] text-slate-400">Chronological history of session actions and data writes</p>
          </div>
        </div>

        {loadingLogs ? (
          <div className="text-center py-10 space-y-2 text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Retransmitting security stream...</p>
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center py-10 text-slate-400 text-xs">No activity rows captured in auditing.</p>
        ) : (
          <div className="border border-slate-100 rounded-xl overflow-hidden text-[11px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[9px] border-b">
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Meta Details</th>
                  <th className="py-2.5 px-4">Origin IP</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-600 font-mono">
                {logs.slice(0, 15).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/40">
                    <td className="py-2 px-4 font-bold text-slate-800">
                      <span className="bg-slate-100 py-0.5 px-1.5 rounded text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-4 truncate max-w-[250px]">{log.details || "—"}</td>
                    <td className="py-2 px-4 text-slate-400">{log.ip_address}</td>
                    <td className="py-2 px-4 text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

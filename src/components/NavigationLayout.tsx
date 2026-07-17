import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.js";
import { CategoryIcon } from "./CategoryIcon.js";
import {
  LayoutDashboard,
  ArrowUpDown,
  Wallet,
  PiggyBank,
  User,
  Plus,
  Bell,
  LogOut,
  X,
  Check,
  Database,
  CloudLightning,
  AlertTriangle,
  FileCheck
} from "lucide-react";

interface NavigationLayoutProps {
  children: React.ReactNode;
  onOpenQuickAdd: () => void;
}

export const NavigationLayout: React.FC<NavigationLayoutProps> = ({ children, onOpenQuickAdd }) => {
  const { user, logout, api, isDbConnected, dbStatusMessage } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Transactions", path: "/transactions", icon: ArrowUpDown },
    { label: "Budgets", path: "/budgets", icon: Wallet },
    { label: "Savings Goals", path: "/savings", icon: PiggyBank },
    { label: "Profile Settings", path: "/profile", icon: User },
  ];

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get("/notifications");
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.data.filter((n: any) => !n.is_read).length);
      }
    } catch (err) {
      console.error("Failed to retrieve warning notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 30 seconds for real-time budget limits breach warning feedback!
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismissNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      // Re-evaluate unread
      setUnreadCount(prev => notifications.find(n => n.id === id)?.is_read ? prev : Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const getNotificationStyles = (type: string) => {
    switch (type) {
      case "warning":
        return "border-amber-100 bg-amber-50/60 text-amber-800";
      case "success":
        return "border-emerald-100 bg-emerald-50/60 text-emerald-800";
      default:
        return "border-slate-100 bg-slate-50 text-slate-800";
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      
      {/* ==========================================
          DESKTOP SIDEBAR
         ========================================== */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 fixed h-full z-40">
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center gap-2.5 border-b border-slate-100">
          <div className="w-9 h-9 bg-gradient-to-tr from-teal-600 to-emerald-500 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-teal-600/20 text-base">
            P
          </div>
          <span className="font-display font-bold text-slate-900 tracking-tight text-lg">PocketPal</span>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 m-3 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden border border-teal-200">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold text-slate-800 text-sm truncate">{user?.name}</p>
              <p className="text-slate-400 text-xs truncate leading-tight">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-teal-50 text-teal-700 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={isActive ? "text-teal-600" : "text-slate-400"} size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop Footer Stats */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <button
            onClick={onOpenQuickAdd}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-4 rounded-xl text-sm font-semibold shadow-md shadow-teal-600/10 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Transaction</span>
          </button>

          <button
            onClick={() => logout().then(() => navigate("/login"))}
            className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-rose-600 py-2 hover:bg-rose-50 rounded-xl transition-all text-xs font-semibold cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>

      {/* ==========================================
          MOBILE HEADER
         ========================================== */}
      <header className="md:hidden h-16 bg-white border-b border-slate-200/80 px-4 flex items-center justify-between sticky top-0 z-40 w-full shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8.5 h-8.5 bg-gradient-to-tr from-teal-600 to-emerald-500 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md shadow-teal-600/15">
            P
          </div>
          <span className="font-display font-bold tracking-tight text-slate-800 text-base">PocketPal</span>
        </div>

        {/* Action icons right */}
        <div className="flex items-center gap-2">
          {/* Notification Button */}
          <button
            onClick={() => {
              fetchNotifications();
              setShowNotifications(true);
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-600 relative transition-all"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>
          
          <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden border border-teal-200">
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user?.name.charAt(0).toUpperCase()
            )}
          </div>
        </div>
      </header>

      {/* ==========================================
          DESKTOP TOP BAR (Notification alert widget)
         ========================================== */}
      <div className="flex-1 flex flex-col md:pl-64 pb-20 md:pb-0 min-w-0">
        <div className="hidden md:flex h-16 bg-white border-b border-slate-200/60 px-8 items-center justify-between sticky top-0 z-30">
          <h1 className="font-display font-semibold text-slate-700 text-sm">
            Welcome back, <span className="text-teal-600 font-bold">{user?.name}</span>
          </h1>

          <div className="flex items-center gap-4">
            {/* Realtime Alert Feed Trigger */}
            <button
              onClick={() => {
                fetchNotifications();
                setShowNotifications(true);
              }}
              className="flex items-center gap-2 py-1.5 px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-xs font-semibold relative cursor-pointer"
            >
              <Bell size={14} className={unreadCount > 0 ? "text-teal-600" : ""} />
              <span>Budget Alerts</span>
              {unreadCount > 0 && (
                <span className="w-2.5 h-2.5 bg-rose-500 border border-white rounded-full absolute -top-1 -right-1" />
              )}
            </button>
          </div>
        </div>

        {/* MAIN VIEW CONTENT CONTAINER */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full animate-fade-in">
          {children}
        </main>
      </div>

      {/* ==========================================
          MOBILE BOTTOM NAVIGATION RAIL
         ========================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur border-t border-slate-200/80 px-2 flex items-center justify-around z-40 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
        {navItems.slice(0, 2).map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-all ${
                isActive ? "text-teal-600" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <Icon size={19} className={isActive ? "text-teal-600 stroke-[2.5]" : "text-slate-400"} />
              <span className="mt-1 font-display">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}

        {/* Floating Centered Plus Button on Mobile */}
        <div className="relative -top-4 px-2">
          <button
            onClick={onOpenQuickAdd}
            className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-teal-600/30 hover:bg-teal-700 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus size={24} />
          </button>
        </div>

        {navItems.slice(2).map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-all ${
                isActive ? "text-teal-600" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <Icon size={19} className={isActive ? "text-teal-600 stroke-[2.5]" : "text-slate-400"} />
              <span className="mt-1 font-display">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>

      {/* ==========================================
          NOTIFICATION SLIDE-OUT PANEL
         ========================================== */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setShowNotifications(false)}
          />

          {/* Panel Container */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-slide-up md:animate-none">
            {/* Header */}
            <div className="h-16 border-b border-slate-100 px-6 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-teal-600" />
                <h3 className="font-display font-semibold text-slate-900 text-base">In-App Alert Center</h3>
                {unreadCount > 0 && (
                  <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {unreadCount} Pending
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check size={20} />
                  </div>
                  <p className="font-display font-semibold text-slate-800 text-sm">All Quiet here!</p>
                  <p className="text-slate-400 text-xs mt-1">
                    No active budget breaches, milestone notifications, or warnings to report.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed relative group transition-all cursor-pointer hover:shadow-sm ${getNotificationStyles(
                      n.type
                    )} ${!n.is_read ? "ring-1 ring-teal-500/10 font-medium shadow-xs" : "opacity-75"}`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          {!n.is_read && <span className="w-1.5 h-1.5 bg-teal-500 rounded-full shrink-0" />}
                          <p className="font-display font-bold text-slate-800 text-xs">{n.title}</p>
                        </div>
                        <p className="text-slate-600 mt-1">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-2 font-mono">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>

                      {/* Close Trigger */}
                      <button
                        onClick={(e) => handleDismissNotification(n.id, e)}
                        className="p-1 rounded text-slate-400 hover:bg-slate-200/50 hover:text-slate-700 transition-all cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Clear All Trigger Footer */}
            {notifications.length > 0 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Clear Badge Count
                </button>
                <button
                  onClick={async () => {
                    // Simple bulk dismiss helper
                    try {
                      for (const n of notifications) {
                        await api.delete(`/notifications/${n.id}`).catch(() => null);
                      }
                      setNotifications([]);
                      setUnreadCount(0);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Dismiss All Warning Banners
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

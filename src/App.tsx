import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext.js";
import { LoginView } from "./views/LoginView.js";
import { RegisterView } from "./views/RegisterView.js";
import { DashboardView } from "./views/DashboardView.js";
import { TransactionsView } from "./views/TransactionsView.js";
import { BudgetsView } from "./views/BudgetsView.js";
import { SavingsGoalsView } from "./views/SavingsGoalsView.js";
import { ProfileView } from "./views/ProfileView.js";
import { NavigationLayout } from "./components/NavigationLayout.js";
import { QuickAddModal } from "./components/QuickAddModal.js";

// Protected Route Guard component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-semibold font-display">Initializing PocketPal Session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};


// Protected Layout Wrapper to wire up Quick Actions trigger globally
const AppLayout: React.FC = () => {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  // Simple key increment to force redraw and fetch transactions inside active routes on success!
  const [refreshKey, setRefreshKey] = useState(0);

  const handleQuickAddSuccess = () => {
    // Incrementing forces context-bound route re-fetch beautifully!
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <NavigationLayout onOpenQuickAdd={() => setIsQuickAddOpen(true)}>
      <Routes>
        <Route path="/dashboard" element={<DashboardView key={`dashboard-${refreshKey}`} />} />
        <Route path="/transactions" element={<TransactionsView key={`transactions-${refreshKey}`} />} />
        <Route path="/budgets" element={<BudgetsView key={`budgets-${refreshKey}`} />} />
        <Route path="/savings" element={<SavingsGoalsView key={`savings-${refreshKey}`} />} />
        <Route path="/profile" element={<ProfileView key={`profile-${refreshKey}`} />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {/* Unified floating Quick Transaction Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={handleQuickAddSuccess}
      />
    </NavigationLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Views */}
          <Route path="/login" element={<LoginView />} />
          <Route path="/register" element={<RegisterView />} />

          {/* Protected Area */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ReactNode } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { PageLayout } from "./components/layout/PageLayout";
import { Dashboard } from "./pages/Dashboard";
import { Students } from "./pages/Students";
import { StudentProfile } from "./pages/StudentProfile";
import { Staff } from "./pages/Staff";
import { StaffProfile } from "./pages/StaffProfile";
import { Fees } from "./pages/Fees";
import { Ledger } from "./pages/Ledger";
import Batches from "./pages/Batches";
import { Expenses } from "./pages/Expenses";
import { Enquiries } from "./pages/Enquiries";
import { Permissions } from "./pages/Permissions";
import { Login } from "./pages/Login";
import { AccessDenied } from "./components/AccessDenied";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { AnimatePresence } from "motion/react";
import { api } from "./lib/api";
import { hasPermission, PermissionKey, refreshPermissions } from "./lib/permissions";

// Route wrapper mapping paths and roles to authorization criteria
function PermittedRoute({ element, permissionKey }: { element: ReactNode; permissionKey: PermissionKey }) {
  const userRole = localStorage.getItem("triyuga_user_role") || "Admin";
  if (!hasPermission(userRole, permissionKey)) {
    return <AccessDenied />;
  }
  return <>{element}</>;
}

// Route wrapper restrict-locking page to Admin-only clearance
function AdminRoute({ element }: { element: ReactNode }) {
  const userRole = localStorage.getItem("triyuga_user_role") || "Admin";
  if (userRole !== "Admin") {
    return <AccessDenied />;
  }
  return <>{element}</>;
}

// Active session checker to verify if the logged-in user credential has been deleted
function SessionValidator({ onLogout }: { onLogout: () => void }) {
  const { pathname } = useLocation();

  useEffect(() => {
    const verifyUserSession = async () => {
      const username = localStorage.getItem("triyuga_username");
      if (!username) return;
      
      // Allow root admin to always bypass DB-list validation so they are never locked out
      if (username.toLowerCase() === "admin") return;

      try {
        const users = await api.getUsers();
        const userExists = users.some((u: any) => u.username?.toLowerCase() === username.toLowerCase());
        if (!userExists) {
          console.log("Current user has been deleted or is invalid.");
          onLogout();
        }
      } catch (e) {
        console.error("Failed to verify user session:", e);
      }
    };

    verifyUserSession();

    // Recheck immediately if credentials or configurations are updated locally
    window.addEventListener('triyuga_permissions_updated', verifyUserSession);
    
    // Check when refocusing the app window
    window.addEventListener('focus', verifyUserSession);

    // Periodic check every 8 seconds for real-time security
    const interval = setInterval(verifyUserSession, 8000);

    return () => {
      window.removeEventListener('triyuga_permissions_updated', verifyUserSession);
      window.removeEventListener('focus', verifyUserSession);
      clearInterval(interval);
    };
  }, [pathname, onLogout]);

  return null;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    localStorage.getItem("triyuga_auth") === "true"
  );
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [permissionsTrigger, setPermissionsTrigger] = useState(0);

  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => {
    localStorage.removeItem("triyuga_auth");
    localStorage.removeItem("triyuga_user_role");
    localStorage.removeItem("triyuga_user_fullname");
    localStorage.removeItem("triyuga_username");
    setIsAuthenticated(false);
  };
  
  // Real-time developer quick switcher or user details updates listeners
  useEffect(() => {
    const handleUpdate = () => {
      setPermissionsTrigger((prev) => prev + 1);
    };
    window.addEventListener('triyuga_permissions_updated', handleUpdate);
    return () => {
      window.removeEventListener('triyuga_permissions_updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      // Refresh permissions from Supabase to ensure synchronization
      refreshPermissions();

      // Background preload/eager load the entire dashboard and school dataset in parallel
      // to pre-populate caches and guarantee instantly rendered profiles & operations dashboard
      Promise.all([
        api.getStudents(),
        api.getStaff(),
        api.getInvoices(),
        api.getExpenses(),
        api.getActivityLogs(),
        api.getBatches()
      ]).catch(err => {
        console.warn("Background prefetching did not complete fully:", err);
      });
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showWelcome && <WelcomeScreen onComplete={() => setShowWelcome(false)} />}
      </AnimatePresence>
      <Router>
        <SessionValidator onLogout={handleLogout} />
        <PageLayout>
          <Routes>
            <Route path="/" element={<PermittedRoute element={<Dashboard isWelcomeActive={showWelcome} />} permissionKey="dashboard" />} />
            <Route path="/students" element={<PermittedRoute element={<Students />} permissionKey="students" />} />
            <Route path="/students/:id" element={<PermittedRoute element={<StudentProfile />} permissionKey="students" />} />
            <Route path="/enquiries" element={<PermittedRoute element={<Enquiries />} permissionKey="enquiries" />} />
            <Route path="/staff" element={<PermittedRoute element={<Staff />} permissionKey="staff" />} />
            <Route path="/staff/:id" element={<PermittedRoute element={<StaffProfile />} permissionKey="staff" />} />
            <Route path="/fees" element={<PermittedRoute element={<Fees />} permissionKey="fees" />} />
            <Route path="/ledger" element={<PermittedRoute element={<Ledger />} permissionKey="ledger" />} />
            <Route path="/batches" element={<PermittedRoute element={<Batches />} permissionKey="batches" />} />
            <Route path="/expenses" element={<PermittedRoute element={<Expenses />} permissionKey="expenses" />} />
            <Route path="/permissions" element={<AdminRoute element={<Permissions />} />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageLayout>
      </Router>
    </>
  );
}

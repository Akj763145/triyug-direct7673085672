/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { PageLayout } from "./components/layout/PageLayout";
import { Dashboard } from "./pages/Dashboard";
import { Students } from "./pages/Students";
import { StudentProfile } from "./pages/StudentProfile";
import { Staff } from "./pages/Staff";
import { Fees } from "./pages/Fees";
import { Ledger } from "./pages/Ledger";
import Batches from "./pages/Batches";
import { Resources } from "./pages/Resources";
import { Login } from "./pages/Login";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    localStorage.getItem("triyuga_auth") === "true"
  );

  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => {
    localStorage.removeItem("triyuga_auth");
    setIsAuthenticated(false);
  };

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
    <Router>
      <PageLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/students/:id" element={<StudentProfile />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/fees" element={<Fees />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/batches" element={<Batches />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageLayout>
    </Router>
  );
}

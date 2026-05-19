/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { PageLayout } from "./components/layout/PageLayout";
import { Dashboard } from "./pages/Dashboard";
import { Students } from "./pages/Students";
import { Staff } from "./pages/Staff";
import { Fees } from "./pages/Fees";
import { Ledger } from "./pages/Ledger";
import { Resources } from "./pages/Resources";

export default function App() {
  return (
    <Router>
      <PageLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/fees" element={<Fees />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/resources" element={<Resources />} />
        </Routes>
      </PageLayout>
    </Router>
  );
}

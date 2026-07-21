import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";

import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import Analytics from "./pages/Analytics";
import Compliance from "./pages/Compliance";
import Alerts from "./pages/Alerts";
import AIChat from "./pages/AIChat";
import Settings from "./pages/Settings";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Dashboard />} />

          <Route path="documents" element={<Documents />} />

          <Route path="analytics" element={<Analytics />} />

          <Route path="compliance" element={<Compliance />} />

          <Route path="assistant" element={<AIChat />} />

          <Route path="alerts" element={<Alerts />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
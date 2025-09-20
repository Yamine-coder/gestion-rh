// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import LoginPage     from "./pages/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AdminDashboard from "./pages/AdminDashboard";
import Pointage      from "./pages/Pointage";
import Badgeuse      from "./pages/Badgeuse";
import HomeEmploye   from "./pages/HomeEmploye";
import ProfilEmploye from "./pages/ProfilEmploye";
import MesConges     from "./components/MesConges";
import ProtectedRoute from "./components/ProtectedRoute";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute roleRequired="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/mes-conges"
        element={
          <ProtectedRoute roleRequired="employee">
            <MesConges />
          </ProtectedRoute>
        }
      />

      <Route
        path="/home"
        element={
          <ProtectedRoute roleRequired="employee">
            <HomeEmploye />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pointage"
        element={
          <ProtectedRoute roleRequired="employee">
            <Pointage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee/profil"
        element={
          <ProtectedRoute roleRequired="employee">
            <ProfilEmploye />
          </ProtectedRoute>
        }
      />

      <Route path="/badgeuse" element={<Badgeuse />} />

      {/* Tout autre chemin renvoie à la page de login */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
      <Router>
        <ToastContainer 
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        <AppRoutes />
      </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

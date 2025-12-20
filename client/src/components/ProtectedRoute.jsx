// client/src/components/ProtectedRoute.jsx
import { useEffect } from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  // Ajouter app-loaded sur html pour les pages authentifiées (fond blanc au lieu du rose login)
  useEffect(() => {
    document.documentElement.classList.add('app-loaded');
    return () => {
      document.documentElement.classList.remove('app-loaded');
    };
  }, []);

  if (!token) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;

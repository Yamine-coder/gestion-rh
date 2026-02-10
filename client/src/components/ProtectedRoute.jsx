// client/src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, roleRequired }) => {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/login" />;
  }

  // Vérification du rôle si spécifié
  if (roleRequired && userRole !== roleRequired) {
    // Un employé qui tente d'accéder à /admin → redirigé vers son dashboard
    if (roleRequired === 'admin' && userRole === 'employee') {
      return <Navigate to="/home" />;
    }
    // Un admin qui tente d'accéder à une page employé → redirigé vers admin
    if (roleRequired === 'employee' && userRole === 'admin') {
      return <Navigate to="/admin" />;
    }
    // Cas par défaut
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;

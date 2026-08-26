import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading…</span>
      </div>
    );
  }

  return currentUser ? <Outlet /> : <Navigate to="/signin" replace />;
}

import { Navigate, Outlet } from 'react-router-dom';
import { useStore } from '../store';

export default function ProtectedRoute({ requireAdmin = false }) {
  const user = useStore((s) => s.user);
  const token = useStore((s) => s.token);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !user.is_admin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

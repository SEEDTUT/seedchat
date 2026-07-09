import { Navigate, Outlet } from 'react-router-dom';
import { useStore } from '../store';

export default function ProtectedRoute({ requireAdmin = false }) {
  const user = useStore((s) => s.user);
  const token = useStore((s) => s.token);
  const isAdminMode = useStore((s) => s.is_admin_mode);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // 管理员路由：数据库管理员 或 管理员模式登录 均可访问
  if (requireAdmin && !user.is_admin && !isAdminMode) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

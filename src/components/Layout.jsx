import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Users, MessageSquare, Shield, LogOut, Menu, X } from 'lucide-react';
import { useStore } from '../store';
import { toast } from 'sonner';

export default function Layout() {
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('已退出登录');
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: '首页', icon: Home, end: true },
    { to: '/friends', label: '好友', icon: Users },
    { to: '/messages', label: '私信', icon: MessageSquare },
  ];

  if (user?.is_admin) {
    navItems.push({ to: '/admin', label: '管理后台', icon: Shield });
  }

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-2xl transition ${
      isActive
        ? 'bg-primary text-white'
        : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="min-h-screen">
      {/* 顶部固定导航栏 */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-6xl px-4 mt-3">
          <nav className="bg-white/80 backdrop-blur-md border border-gray-100 rounded-3xl shadow-sm px-4 sm:px-6 py-3 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌱</span>
              <span className="text-xl font-bold text-gray-900">seedchat</span>
            </div>

            {/* 桌面端导航 */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={linkClass}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>

            {/* 右侧用户区 */}
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {user?.username}
                {user?.is_admin && (
                  <span className="ml-1 text-xs bg-primary-50 text-primary px-2 py-0.5 rounded-full">
                    管理员
                  </span>
                )}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-600 hover:bg-gray-100 transition text-sm"
              >
                <LogOut size={16} />
                退出
              </button>
            </div>

            {/* 移动端汉堡按钮 */}
            <button
              className="md:hidden p-2 rounded-2xl hover:bg-gray-100 transition"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </nav>

          {/* 移动端菜单 */}
          {menuOpen && (
            <div className="md:hidden mt-2 bg-white/95 backdrop-blur-md border border-gray-100 rounded-3xl shadow-lg p-4 flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={linkClass}
                  onClick={() => setMenuOpen(false)}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
              <div className="border-t border-gray-100 my-2"></div>
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm text-gray-600">
                  {user?.username}
                  {user?.is_admin && (
                    <span className="ml-1 text-xs bg-primary-50 text-primary px-2 py-0.5 rounded-full">
                      管理员
                    </span>
                  )}
                </span>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-600 hover:bg-gray-100 transition text-sm"
                >
                  <LogOut size={16} />
                  退出
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 主内容区 */}
      <main className="mx-auto max-w-6xl px-4 pt-24 pb-12">
        <Outlet />
      </main>
    </div>
  );
}

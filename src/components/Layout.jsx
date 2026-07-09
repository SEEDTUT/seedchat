import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  Bell,
  CheckCheck,
} from 'lucide-react';
import { useStore } from '../store';
import { notificationsApi } from '../api';
import { toast } from 'sonner';
import { formatTime } from '../lib/time';

function HeaderAvatar({ user, size = 'w-9 h-9' }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt=""
        className={`${size} rounded-2xl object-cover`}
      />
    );
  }
  return (
    <div
      className={`${size} rounded-2xl bg-primary-100 text-primary flex items-center justify-center font-semibold`}
    >
      {(user?.nickname || user?.username || '?').charAt(0).toUpperCase()}
    </div>
  );
}

export default function Layout() {
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const notifRef = useRef(null);

  const navItems = [
    { to: '/', label: '首页', icon: Home, end: true },
    { to: '/friends', label: '好友', icon: Users },
    { to: '/settings', label: '设置', icon: Settings },
  ];

  if (user?.is_admin) {
    navItems.push({ to: '/admin', label: '管理后台', icon: Shield });
  }

  const handleLogout = () => {
    logout();
    toast.success('已退出登录');
    navigate('/login');
  };

  const loadNotifications = async () => {
    try {
      const [list, count] = await Promise.all([
        notificationsApi.list(),
        notificationsApi.unreadCount(),
      ]);
      setNotifications(list || []);
      setUnread(count?.count || 0);
    } catch {
      // 静默忽略
    }
  };

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 10000);
    return () => clearInterval(timer);
  }, []);

  // 点击外部关闭通知下拉
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnread(0);
    } catch (err) {
      toast.error(err.message || '操作失败');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnread((u) => Math.max(0, u - 1));
    } catch (err) {
      toast.error(err.message || '操作失败');
    }
  };

  const recentNotifications = notifications.slice(0, 15);

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
              {/* 通知铃铛 */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen((v) => !v)}
                  className="relative p-2 rounded-2xl text-gray-600 hover:bg-gray-100 transition"
                  title="通知"
                >
                  <Bell size={20} />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <span className="font-semibold text-gray-900">通知</span>
                      {unread > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <CheckCheck size={14} />
                          全部已读
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {recentNotifications.length === 0 ? (
                        <div className="px-4 py-10 text-center text-gray-400 text-sm">
                          暂无通知
                        </div>
                      ) : (
                        recentNotifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => handleMarkRead(n.id)}
                            className={`w-full flex items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
                              !n.is_read ? 'bg-primary-50/60' : ''
                            }`}
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              {n.from_avatar ? (
                                <img
                                  src={n.from_avatar}
                                  alt=""
                                  className="w-9 h-9 rounded-2xl object-cover"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-2xl bg-primary-100 text-primary flex items-center justify-center font-semibold">
                                  {(n.from_username || '?')
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-800 break-words">
                                <span className="font-medium">
                                  {n.from_username}
                                </span>{' '}
                                {n.content}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {formatTime(n.created_at)}
                              </p>
                            </div>
                            {!n.is_read && (
                              <span className="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full bg-primary" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 用户头像与名称 */}
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2 rounded-2xl hover:bg-gray-100 transition pr-2"
                title="个人设置"
              >
                <HeaderAvatar user={user} />
                <span className="text-sm text-gray-600 flex items-center">
                  {user?.nickname || user?.username}
                  {user?.is_admin && (
                    <span className="ml-1 text-xs bg-primary-50 text-primary px-2 py-0.5 rounded-full">
                      管理员
                    </span>
                  )}
                </span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-600 hover:bg-gray-100 transition text-sm"
              >
                <LogOut size={16} />
                退出
              </button>
            </div>

            {/* 移动端右侧：通知 + 汉堡 */}
            <div className="flex md:hidden items-center gap-1">
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen((v) => !v)}
                  className="relative p-2 rounded-2xl text-gray-600 hover:bg-gray-100 transition"
                  title="通知"
                >
                  <Bell size={20} />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <span className="font-semibold text-gray-900">通知</span>
                      {unread > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <CheckCheck size={14} />
                          全部已读
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {recentNotifications.length === 0 ? (
                        <div className="px-4 py-10 text-center text-gray-400 text-sm">
                          暂无通知
                        </div>
                      ) : (
                        recentNotifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => handleMarkRead(n.id)}
                            className={`w-full flex items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
                              !n.is_read ? 'bg-primary-50/60' : ''
                            }`}
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              {n.from_avatar ? (
                                <img
                                  src={n.from_avatar}
                                  alt=""
                                  className="w-9 h-9 rounded-2xl object-cover"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-2xl bg-primary-100 text-primary flex items-center justify-center font-semibold">
                                  {(n.from_username || '?')
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-800 break-words">
                                <span className="font-medium">
                                  {n.from_username}
                                </span>{' '}
                                {n.content}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {formatTime(n.created_at)}
                              </p>
                            </div>
                            {!n.is_read && (
                              <span className="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full bg-primary" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                className="p-2 rounded-2xl hover:bg-gray-100 transition"
                onClick={() => setMenuOpen((v) => !v)}
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
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
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="flex items-center gap-2"
                >
                  <HeaderAvatar user={user} size="w-8 h-8" />
                  <span className="text-sm text-gray-600 flex items-center">
                    {user?.nickname || user?.username}
                    {user?.is_admin && (
                      <span className="ml-1 text-xs bg-primary-50 text-primary px-2 py-0.5 rounded-full">
                        管理员
                      </span>
                    )}
                  </span>
                </button>
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

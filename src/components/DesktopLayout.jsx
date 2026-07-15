import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  Settings,
  Shield,
  LogOut,
  Bell,
  CheckCheck,
  Info,
  Package,
  MessageSquare,
} from 'lucide-react';
import { useStore } from '../store';
import { notificationsApi } from '../api';
import { toast } from 'sonner';
import { formatTime } from '../lib/time';
import { shortUid } from '../lib/uid';
import DefaultAvatar from './DefaultAvatar';
import { NameplateBadge } from './Nameplate';
import AvatarReminder from './AvatarReminder';

function SidebarAvatar({ user, size = 40 }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt=""
        className="rounded-xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return <DefaultAvatar seed={user?.id} size={size} />;
}

function NotifAvatar({ n, size = 36 }) {
  if (n.from_avatar) {
    return (
      <img
        src={n.from_avatar}
        alt=""
        className="rounded-lg object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return <DefaultAvatar seed={n.from_user_id} size={size} />;
}

export default function DesktopLayout() {
  const user = useStore((s) => s.user);
  const isAdminMode = useStore((s) => s.is_admin_mode);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const notifRef = useRef(null);

  const showAdminFeatures = user?.is_admin || isAdminMode;

  const navItems = [
    { to: '/', label: '论坛', icon: Home, end: true },
    { to: '/friends', label: '好友', icon: Users },
    { to: '/messages', label: '消息', icon: MessageSquare },
    { to: '/updates', label: '更新', icon: Package },
    { to: '/about', label: '关于', icon: Info },
    { to: '/settings', label: '设置', icon: Settings },
  ];

  if (showAdminFeatures) {
    navItems.push({ to: '/admin', label: '管理', icon: Shield });
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
    } catch {}
  };

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.body.classList.add('desktop-app');
    return () => document.body.classList.remove('desktop-app');
  }, []);

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

  const recentNotifications = notifications.slice(0, 20);

  const sidebarWidth = collapsed ? 64 : 200;

  return (
    <div className="h-screen flex bg-gray-100 overflow-hidden">
      {/* ===== Left Sidebar ===== */}
      <aside
        className="flex flex-col bg-gray-900 text-gray-300 transition-all duration-200 flex-shrink-0"
        style={{ width: sidebarWidth }}
      >
        {/* Logo / Title */}
        <div
          className="flex items-center gap-2 px-4 h-14 border-b border-gray-800 cursor-pointer"
          onClick={() => setCollapsed((v) => !v)}
        >
          <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
          {!collapsed && (
            <span className="text-sm font-bold text-white truncate">SeedChat</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition relative group ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`
                }
                title={collapsed ? item.label : ''}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!collapsed && <span className="text-sm truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User area at bottom */}
        <div className="border-t border-gray-800 p-2">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-800 transition cursor-pointer"
            onClick={() => navigate('/settings')}
          >
            <SidebarAvatar user={user} size={32} />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white font-medium truncate flex items-center gap-1">
                  {user?.nickname || user?.username}
                  <NameplateBadge obj={user} />
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                  @{user?.uid || shortUid(user?.id)}
                </div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2 py-2 mt-1 rounded-lg text-gray-500 hover:bg-gray-800 hover:text-white transition text-xs"
            >
              <LogOut size={16} />
              退出登录
            </button>
          )}
        </div>
      </aside>

      {/* ===== Main Content Area ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between h-14 px-6 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900">SeedChat</h1>
            {showAdminFeatures && (
              <span className="text-xs bg-primary-50 text-primary px-2 py-0.5 rounded-full">
                {isAdminMode ? '管理员模式' : '管理员'}
              </span>
            )}
          </div>

          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
              title="通知"
            >
              <Bell size={20} />
              {unread > 0 && (
                <span className="absolute top-0 right-0 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
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
                          !n.is_read ? 'bg-primary-50/40' : ''
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <NotifAvatar n={n} size={36} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-800 break-words">
                            <span className="font-medium">{n.from_username}</span>{' '}
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
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-5xl mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>

      <AvatarReminder />
    </div>
  );
}

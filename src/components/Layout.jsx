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
  Info,
  Package,
} from 'lucide-react';
import { useStore } from '../store';
import { notificationsApi } from '../api';
import { toast } from 'sonner';
import { formatTime } from '../lib/time';
import { shortUid } from '../lib/uid';
import DefaultAvatar from './DefaultAvatar';
import { NameplateBadge } from './Nameplate';
import SponsorName from './SponsorName';
import AvatarReminder from './AvatarReminder';

// 顶部头像：有头像用图片，否则用几何默认头像
function HeaderAvatar({ user, size = 36 }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt=""
        className="rounded-2xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return <DefaultAvatar seed={user?.id} size={size} />;
}

// 通知列表项头像
function NotifAvatar({ n, size = 36 }) {
  if (n.from_avatar) {
    return (
      <img
        src={n.from_avatar}
        alt=""
        className="rounded-2xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return <DefaultAvatar seed={n.from_user_id} size={size} />;
}

export default function Layout() {
  const user = useStore((s) => s.user);
  const isAdminMode = useStore((s) => s.is_admin_mode);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const notifRef = useRef(null);

  const showAdminFeatures = user?.is_admin || isAdminMode;

  const navItems = [
    { to: '/', label: '首页', icon: Home, end: true },
    { to: '/friends', label: '好友', icon: Users },
    { to: '/updates', label: '更新', icon: Package },
    { to: '/about', label: '关于', icon: Info },
    { to: '/settings', label: '设置', icon: Settings },
  ];

  if (showAdminFeatures) {
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

  const renderNotifList = (widthClass) => (
    <div className={`mt-2 ${widthClass} bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden`}>
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
  );

  const renderUserChip = () => (
    <div className="flex items-center gap-2">
      <HeaderAvatar user={user} />
      <div className="flex flex-col">
        <span className="text-sm text-gray-600 flex items-center gap-1.5 flex-wrap">
          <SponsorName isSponsor={user?.is_sponsor} sponsorTier={user?.sponsor_tier}>{user?.nickname || user?.username}</SponsorName>
          <NameplateBadge obj={user} />
          {showAdminFeatures && (
            <span className="text-xs bg-primary-50 text-primary px-2 py-0.5 rounded-full">
              {isAdminMode ? '管理员模式' : '管理员'}
            </span>
          )}
        </span>
        <span className="text-xs text-gray-400">@{user?.uid || shortUid(user?.id)}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* 顶部固定导航栏 */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-6xl px-4 mt-3">
          <nav className="bg-white/80 backdrop-blur-md border border-gray-100 rounded-3xl shadow-sm px-4 sm:px-6 py-3 flex items-center justify-between">
            {/* Logo */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <img
                src="/logo.png"
                alt="seedchat×丐帮"
                className="w-8 h-8 rounded-xl object-cover"
              />
              <span className="text-xl font-bold text-gray-900">seedchat×丐帮</span>
            </button>

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
                {notifOpen && <div className="absolute right-0">{renderNotifList('w-80')}</div>}
              </div>

              {/* 用户头像与名称 */}
              <button
                onClick={() => navigate('/settings')}
                className="rounded-2xl hover:bg-gray-100 transition pr-2"
                title="个人设置"
              >
                {renderUserChip()}
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
                {notifOpen && <div className="absolute right-0">{renderNotifList('w-72')}</div>}
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
                  className="flex items-center gap-2 min-w-0"
                >
                  <HeaderAvatar user={user} size={32} />
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="text-sm text-gray-600 flex items-center gap-1.5 flex-wrap">
                      <SponsorName isSponsor={user?.is_sponsor} sponsorTier={user?.sponsor_tier}>{user?.nickname || user?.username}</SponsorName>
                      <NameplateBadge obj={user} />
                    </span>
                    <span className="text-xs text-gray-400">
                      @{user?.uid || shortUid(user?.id)}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-600 hover:bg-gray-100 transition text-sm flex-shrink-0"
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

      {/* 首次进入提醒设置头像 */}
      <AvatarReminder />
    </div>
  );
}

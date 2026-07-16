import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Settings as SettingsIcon,
  Bell,
  X,
  CheckCheck,
  Play,
  Shield,
  MessageSquare,
  Package,
  Info,
} from 'lucide-react';
import { useStore } from '../store';
import { notificationsApi } from '../api';
import { toast } from 'sonner';
import { formatTime } from '../lib/time';
import { shortUid } from '../lib/uid';
import DefaultAvatar from './DefaultAvatar';
import { NameplateBadge } from './Nameplate';
import AvatarReminder from './AvatarReminder';

function HeaderAvatar({ user, size = 32 }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt=""
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return <DefaultAvatar seed={user?.id} size={size} />;
}

function NotifAvatar({ n, size = 32 }) {
  if (n.from_avatar) {
    return (
      <img
        src={n.from_avatar}
        alt=""
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return <DefaultAvatar seed={n.from_user_id} size={size} />;
}

export default function MobileLayout() {
  const user = useStore((s) => s.user);
  const isAdminMode = useStore((s) => s.is_admin_mode);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  // Set body class for mobile CSS
  useEffect(() => {
    document.body.classList.add('mobile-app');
    return () => document.body.classList.remove('mobile-app');
  }, []);

  const showAdminFeatures = user?.is_admin || isAdminMode;

  // 检测是否为手机客户端（APK），仅手机客户端显示短视频入口
  const isMobileApp = typeof navigator !== 'undefined' && navigator.userAgent.includes('SeedChatApp');

  // 底部导航栏 - 管理员显示完整功能，去掉短视频
  const allTabs = showAdminFeatures
    ? [
        { to: '/', label: '论坛', icon: Home, end: true },
        { to: '/messages', label: '消息', icon: MessageSquare, end: false },
        { to: '/admin', label: '管理', icon: Shield, end: false },
        { to: '/updates', label: '更新', icon: Package, end: false },
        { to: '/settings', label: '我的', icon: SettingsIcon, end: false },
      ]
    : isMobileApp
    ? [
        { to: '/', label: '论坛', icon: Home, end: true },
        { to: '/friends', label: '好友', icon: Users, end: false },
        { to: '/shortvideo', label: '短视频', icon: Play, end: false, isShortVideo: true },
        { to: '/settings', label: '我的', icon: SettingsIcon, end: false },
      ]
    : [
        { to: '/', label: '论坛', icon: Home, end: true },
        { to: '/friends', label: '好友', icon: Users, end: false },
        { to: '/settings', label: '我的', icon: SettingsIcon, end: false },
      ];

  // 处理短视频按钮点击 - 导航到 /shortvideo，WebViewClient 会拦截并打开 ShortVideoActivity
  const handleShortVideoClick = () => {
    window.location.href = '/shortvideo';
  };

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

  // Page title based on route
  const getPageTitle = () => {
    const path = location.pathname;
    const params = new URLSearchParams(location.search);
    if (path === '/') return '论坛';
    if (path.startsWith('/friends')) return '好友';
    if (path.startsWith('/messages') && params.get('to')) return '私信';
    if (path.startsWith('/messages')) return '消息';
    if (path.startsWith('/settings')) return '我的';
    if (path.startsWith('/post/')) return '帖子详情';
    if (path.startsWith('/user/')) return '用户主页';
    if (path.startsWith('/about')) return '关于';
    if (path.startsWith('/updates')) return '更新日志';
    if (path.startsWith('/admin')) return '管理后台';
    return 'SeedChat';
  };

  // Check if in chat room (hide header + bottom tab for full-screen chat)
  const searchParams = new URLSearchParams(location.search);
  const isChatRoom = location.pathname.startsWith('/messages') && !!searchParams.get('to');
  const isLoginPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Top bar - hidden in chat room and login */}
      {!isLoginPage && !isChatRoom && (
        <header
          className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex items-center justify-between px-4 h-12">
            {/* Left: back button or logo */}
            {isChatRoom ? (
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1 text-gray-600 active:text-primary -ml-1"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="" className="w-6 h-6 rounded-lg object-cover" />
                <span className="text-base font-bold text-gray-900">{getPageTitle()}</span>
              </div>
            )}

            {/* Right: notification bell */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setNotifOpen(true)}
                className="relative p-2 text-gray-600 active:text-primary"
              >
                <Bell size={20} />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Notification overlay (slide from right) */}
      {notifOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          onClick={() => setNotifOpen(false)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white flex flex-col"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100">
              <span className="font-semibold text-gray-900">通知</span>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs text-primary active:opacity-60"
                  >
                    <CheckCheck size={14} />
                    全部已读
                  </button>
                )}
                <button onClick={() => setNotifOpen(false)} className="p-1">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {recentNotifications.length === 0 ? (
                <div className="px-4 py-16 text-center text-gray-400 text-sm">
                  暂无通知
                </div>
              ) : (
                recentNotifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleMarkRead(n.id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-50 active:bg-gray-50 ${
                      !n.is_read ? 'bg-primary-50/40' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <NotifAvatar n={n} size={32} />
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
                      <span className="flex-shrink-0 mt-1 w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main
        className={`flex-1 overflow-y-auto -webkit-overflow-scrolling-touch ${isLoginPage ? '' : isChatRoom ? '' : 'pt-12'}`}
        style={{
          paddingBottom: isChatRoom || isLoginPage ? '0' : 'calc(56px + env(safe-area-inset-bottom))',
          height: isChatRoom ? '100vh' : undefined,
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Outlet />
      </main>

      {/* Bottom Tab Bar */}
      {!isChatRoom && !isLoginPage && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: 'calc(56px + env(safe-area-inset-bottom))' }}
        >
          {allTabs.map((tab) => {
            const Icon = tab.icon;
            if (tab.isShortVideo) {
              return (
                <button
                  key="shortvideo"
                  onClick={handleShortVideoClick}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 active:opacity-60 transition"
                  style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                >
                  <Icon size={22} strokeWidth={2} className="text-gray-400" />
                  <span className="text-[10px] text-gray-400">{tab.label}</span>
                </button>
              );
            }
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 active:opacity-60 transition"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={22}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={isActive ? 'text-primary' : 'text-gray-400'}
                    />
                    <span
                      className={`text-[10px] ${isActive ? 'text-primary font-medium' : 'text-gray-400'}`}
                    >
                      {tab.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      )}

      <AvatarReminder />
    </div>
  );
}

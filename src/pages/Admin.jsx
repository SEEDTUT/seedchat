import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Users,
  Megaphone,
  Trash2,
  Pin,
  PinOff,
  Plus,
  Tag,
  Package,
  ExternalLink,
  Eye,
  X,
  Crown,
  ShieldOff,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminApi, nameplatesApi } from '../api';
import { useStore } from '../store';
import { formatTime } from '../lib/time';
import { shortUid } from '../lib/uid';
import DefaultAvatar from '../components/DefaultAvatar';
import Nameplate from '../components/Nameplate';

const TABS = [
  { key: 'posts', label: '帖子管理', icon: FileText },
  { key: 'users', label: '用户管理', icon: Users },
  { key: 'nameplates', label: '铭牌管理', icon: Tag },
  { key: 'updates', label: '更新管理', icon: Package },
  { key: 'announcements', label: '公告管理', icon: Megaphone },
];

export default function Admin() {
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'posts';
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);

  // 公告表单
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [submittingAnn, setSubmittingAnn] = useState(false);

  // 铭牌发放表单
  const [npUserId, setNpUserId] = useState('');
  const [npText, setNpText] = useState('');
  const [npBg, setNpBg] = useState('#2563eb');
  const [npColor, setNpColor] = useState('#ffffff');
  const [submittingNp, setSubmittingNp] = useState(false);

  // 查看某用户铭牌
  const [viewingUserId, setViewingUserId] = useState('');
  const [userPlates, setUserPlates] = useState([]);
  const [loadingPlates, setLoadingPlates] = useState(false);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await adminApi.listPosts();
      setPosts(data || []);
    } catch (err) {
      toast.error(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.listUsers();
      setUsers(data || []);
    } catch (err) {
      toast.error(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await adminApi.listAnnouncements();
      setAnnouncements(data || []);
    } catch (err) {
      toast.error(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'posts') loadPosts();
    else if (tab === 'users') loadUsers();
    else if (tab === 'nameplates') loadUsers();
    else if (tab === 'announcements') loadAnnouncements();
  }, [tab]);

  const handleDeletePost = async (post) => {
    if (!window.confirm(`确定要删除帖子「${post.title}」吗？`)) return;
    try {
      await adminApi.removePost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      toast.success('已删除');
    } catch (err) {
      toast.error(err.message || '删除失败');
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`确定要删除用户「${u.username}」吗？此操作不可恢复。`)) return;
    try {
      await adminApi.removeUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast.success('已删除');
    } catch (err) {
      toast.error(err.message || '删除失败');
    }
  };

  const handleActivateSponsor = async (u) => {
    if (!window.confirm(`确定要手动激活用户「${u.nickname || u.username}」的VIP吗？\n（无需订单号）`)) return;
    try {
      await adminApi.activateSponsor(u.id);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_sponsor: 1 } : x)));
      toast.success('VIP已激活');
    } catch (err) {
      toast.error(err.message || '操作失败');
    }
  };

  const handleRevokeSponsor = async (u) => {
    if (!window.confirm(`确定要注销用户「${u.nickname || u.username}」的VIP吗？\n注销后用户将失去VIP，且关联的订单号无法再次激活。`)) return;
    try {
      await adminApi.revokeSponsor(u.id);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_sponsor: 0 } : x)));
      toast.success('VIP已注销');
    } catch (err) {
      toast.error(err.message || '操作失败');
    }
  };

  const handleWithdrawSponsor = async (u) => {
    if (!window.confirm(`确定要撤回用户「${u.nickname || u.username}」的VIP注销吗？\n撤回后该用户关联的订单号将可以再次被激活。`)) return;
    try {
      const result = await adminApi.withdrawSponsor(u.id);
      toast.success(result.message || '已撤回');
    } catch (err) {
      toast.error(err.message || '操作失败');
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) {
      toast.error('请填写标题和内容');
      return;
    }
    setSubmittingAnn(true);
    try {
      const newAnn = await adminApi.createAnnouncement({
        title: annTitle.trim(),
        content: annContent.trim(),
      });
      setAnnouncements((prev) => [newAnn, ...prev]);
      setAnnTitle('');
      setAnnContent('');
      toast.success('公告已创建');
    } catch (err) {
      toast.error(err.message || '创建失败');
    } finally {
      setSubmittingAnn(false);
    }
  };

  const handleTogglePin = async (ann) => {
    try {
      await adminApi.togglePin(ann.id, { is_pinned: !ann.is_pinned });
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === ann.id ? { ...a, is_pinned: !ann.is_pinned } : a))
      );
      toast.success(ann.is_pinned ? '已取消置顶' : '已置顶');
    } catch (err) {
      toast.error(err.message || '操作失败');
    }
  };

  const handleDeleteAnnouncement = async (ann) => {
    if (!window.confirm(`确定要删除公告「${ann.title}」吗？`)) return;
    try {
      await adminApi.removeAnnouncement(ann.id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== ann.id));
      toast.success('已删除');
    } catch (err) {
      toast.error(err.message || '删除失败');
    }
  };

  // 发放铭牌
  const handleGrantNameplate = async (e) => {
    e.preventDefault();
    if (!npUserId) {
      toast.error('请选择用户');
      return;
    }
    if (!npText.trim()) {
      toast.error('请填写铭牌文字');
      return;
    }
    setSubmittingNp(true);
    try {
      await nameplatesApi.grant(npUserId, {
        text: npText.trim(),
        bg_color: npBg,
        text_color: npColor,
      });
      toast.success('铭牌已发放');
      setNpText('');
      // 如果正在查看该用户的铭牌，刷新
      if (viewingUserId === npUserId) {
        loadUserPlates(npUserId);
      }
    } catch (err) {
      toast.error(err.message || '发放失败');
    } finally {
      setSubmittingNp(false);
    }
  };

  const loadUserPlates = async (userId) => {
    if (!userId) return;
    setLoadingPlates(true);
    try {
      const data = await nameplatesApi.userPlates(userId);
      setUserPlates(data || []);
    } catch (err) {
      setUserPlates([]);
      // 接口可能未开放
    } finally {
      setLoadingPlates(false);
    }
  };

  const handleRemovePlate = async (plateId) => {
    if (!window.confirm('确定要删除该铭牌吗？')) return;
    try {
      await nameplatesApi.remove(plateId);
      setUserPlates((prev) => prev.filter((p) => p.id !== plateId));
      toast.success('已删除');
    } catch (err) {
      toast.error(err.message || '删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">管理后台</h1>

      {/* Tab 切换 */}
      <div className="flex gap-2 bg-white rounded-3xl shadow-sm p-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSearchParams({ tab: t.key })}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-medium whitespace-nowrap transition ${
              tab === t.key
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <t.icon size={18} />
            {t.label}
          </button>
        ))}
      </div>

      {/* 帖子管理 */}
      {tab === 'posts' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400">加载中...</div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-sm p-12 text-center text-gray-400">
              暂无帖子
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-5 flex items-start justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 break-words">
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1 flex-wrap">
                    <span>{post.nickname || post.username || post.author}</span>
                    {post.user_id && (
                      <span>@{shortUid(post.user_id)}</span>
                    )}
                    <span>·</span>
                    <span>{formatTime(post.created_at)}</span>
                  </div>
                  <p className="text-gray-600 text-sm mt-2 line-clamp-2 whitespace-pre-wrap break-words">
                    {post.content}
                  </p>
                </div>
                <button
                  onClick={() => handleDeletePost(post)}
                  className="flex-shrink-0 p-2 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 用户管理 */}
      {tab === 'users' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400">加载中...</div>
          ) : users.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-sm p-12 text-center text-gray-400">
              暂无用户
            </div>
          ) : (
            users.map((u) => {
              const isMe = u.id === user?.id;
              const isOtherAdmin = u.is_admin && !isMe;
              const disabled = isMe || isOtherAdmin;
              return (
                <div
                  key={u.id}
                  className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0">
                      {u.avatar ? (
                        <img
                          src={u.avatar}
                          alt=""
                          className="w-11 h-11 rounded-2xl object-cover"
                        />
                      ) : (
                        <DefaultAvatar seed={u.id} size={44} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 truncate">
                          {u.nickname || u.username}
                        </span>
                        {u.is_admin && (
                          <span className="text-xs bg-primary-50 text-primary px-2 py-0.5 rounded-full">
                            管理员
                          </span>
                        )}
                        {u.is_sponsor ? (
                          <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Crown size={11} />
                            VIP
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                            普通
                          </span>
                        )}
                        {isMe && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            我
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        UID: @{shortUid(u.id)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1">
                    {/* VIP 管理 */}
                    {!u.is_sponsor && (
                      <button
                        onClick={() => handleActivateSponsor(u)}
                        className="p-2 rounded-2xl text-gray-400 hover:bg-amber-50 hover:text-amber-500 transition"
                        title="手动激活VIP"
                      >
                        <Crown size={18} />
                      </button>
                    )}
                    {u.is_sponsor && (
                      <button
                        onClick={() => handleRevokeSponsor(u)}
                        className="p-2 rounded-2xl text-gray-400 hover:bg-orange-50 hover:text-orange-500 transition"
                        title="注销VIP（订单号不可再用）"
                      >
                        <ShieldOff size={18} />
                      </button>
                    )}
                    {!u.is_sponsor && (
                      <button
                        onClick={() => handleWithdrawSponsor(u)}
                        className="p-2 rounded-2xl text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition"
                        title="撤回VIP注销（订单号可再次激活）"
                      >
                        <RotateCcw size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteUser(u)}
                      disabled={disabled}
                      className="p-2 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
                      title={
                        disabled ? (isMe ? '不能删除自己' : '不能删除其他管理员') : '删除'
                      }
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 铭牌管理 */}
      {tab === 'nameplates' && (
        <div className="space-y-6">
          {/* 发放铭牌表单 */}
          <form
            onSubmit={handleGrantNameplate}
            className="bg-white rounded-3xl shadow-sm p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Plus size={20} className="text-primary" />
              发放铭牌
            </h2>

            {loading ? (
              <div className="text-center py-6 text-gray-400 text-sm">加载用户中...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择用户
                  </label>
                  <select
                    value={npUserId}
                    onChange={(e) => setNpUserId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition bg-white"
                  >
                    <option value="">请选择用户</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nickname || u.username} (@{shortUid(u.id)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    铭牌文字
                  </label>
                  <input
                    type="text"
                    value={npText}
                    onChange={(e) => setNpText(e.target.value)}
                    placeholder="如：丐帮长老"
                    className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    背景颜色
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={npBg}
                      onChange={(e) => setNpBg(e.target.value)}
                      className="w-12 h-11 rounded-xl border border-gray-200 cursor-pointer p-1"
                    />
                    <input
                      type="text"
                      value={npBg}
                      onChange={(e) => setNpBg(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    文字颜色
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={npColor}
                      onChange={(e) => setNpColor(e.target.value)}
                      className="w-12 h-11 rounded-xl border border-gray-200 cursor-pointer p-1"
                    />
                    <input
                      type="text"
                      value={npColor}
                      onChange={(e) => setNpColor(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 预览 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">预览：</span>
              <Nameplate text={npText || '铭牌'} bgColor={npBg} textColor={npColor} />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingNp || !npUserId}
                className="px-6 py-2.5 rounded-2xl bg-primary text-white font-medium hover:bg-primary-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus size={18} />
                {submittingNp ? '发放中...' : '发放铭牌'}
              </button>
            </div>
          </form>

          {/* 查看用户铭牌 */}
          <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Eye size={20} className="text-primary" />
              查看用户铭牌
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={viewingUserId}
                onChange={(e) => {
                  setViewingUserId(e.target.value);
                  if (e.target.value) loadUserPlates(e.target.value);
                  else setUserPlates([]);
                }}
                className="flex-1 min-w-[200px] px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition bg-white"
              >
                <option value="">选择用户查看其铭牌</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nickname || u.username} (@{shortUid(u.id)})
                  </option>
                ))}
              </select>
            </div>

            {viewingUserId && (
              loadingPlates ? (
                <div className="text-center py-6 text-gray-400 text-sm">加载中...</div>
              ) : userPlates.length === 0 ? (
                <p className="text-sm text-gray-400">该用户暂无铭牌。</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {userPlates.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 bg-gray-50 rounded-2xl pl-1 pr-2 py-1"
                    >
                      <Nameplate
                        text={p.text}
                        bgColor={p.bg_color}
                        textColor={p.text_color}
                      />
                      {p.is_active && (
                        <span className="text-xs text-primary">佩戴中</span>
                      )}
                      <button
                        onClick={() => handleRemovePlate(p.id)}
                        className="p-1 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                        title="删除铭牌"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* 更新管理 */}
      {tab === 'updates' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl shadow-sm p-8 text-center">
            <Package size={48} className="mx-auto text-primary mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Minecraft 组件更新管理
            </h2>
            <p className="text-gray-500 text-sm mb-5">
              在此添加、编辑、删除组件与更新内容。
            </p>
            <button
              onClick={() => navigate('/admin/updates')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-primary text-white font-medium hover:bg-primary-700 transition"
            >
              <ExternalLink size={18} />
              进入组件管理
            </button>
          </div>
        </div>
      )}

      {/* 公告管理 */}
      {tab === 'announcements' && (
        <div className="space-y-6">
          {/* 创建公告表单 */}
          <form
            onSubmit={handleCreateAnnouncement}
            className="bg-white rounded-3xl shadow-sm p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Plus size={20} className="text-primary" />
              创建公告
            </h2>
            <input
              type="text"
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              placeholder="公告标题"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition"
            />
            <textarea
              value={annContent}
              onChange={(e) => setAnnContent(e.target.value)}
              placeholder="公告内容..."
              rows={4}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingAnn}
                className="px-6 py-2.5 rounded-2xl bg-primary text-white font-medium hover:bg-primary-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus size={18} />
                {submittingAnn ? '创建中...' : '创建'}
              </button>
            </div>
          </form>

          {/* 公告列表 */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-gray-400">加载中...</div>
            ) : announcements.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm p-12 text-center text-gray-400">
                暂无公告
              </div>
            ) : (
              announcements.map((ann) => (
                <div
                  key={ann.id}
                  className={`bg-white rounded-3xl shadow-sm hover:shadow-md transition p-5 ${
                    ann.is_pinned ? 'border-2 border-yellow-200' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 break-words">
                          {ann.title}
                        </h3>
                        {ann.is_pinned && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Pin size={12} />
                            置顶
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mt-2 whitespace-pre-wrap break-words">
                        {ann.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatTime(ann.created_at)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePin(ann)}
                        className="p-2 rounded-2xl text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 transition"
                        title={ann.is_pinned ? '取消置顶' : '置顶'}
                      >
                        {ann.is_pinned ? <PinOff size={18} /> : <Pin size={18} />}
                      </button>
                      <button
                        onClick={() => handleDeleteAnnouncement(ann)}
                        className="p-2 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                        title="删除"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

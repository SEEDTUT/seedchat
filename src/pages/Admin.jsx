import { useEffect, useState } from 'react';
import { FileText, Users, Megaphone, Trash2, Pin, PinOff, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '../api';
import { useStore } from '../store';
import { formatTime } from '../lib/time';

const TABS = [
  { key: 'posts', label: '帖子管理', icon: FileText },
  { key: 'users', label: '用户管理', icon: Users },
  { key: 'announcements', label: '公告管理', icon: Megaphone },
];

export default function Admin() {
  const user = useStore((s) => s.user);
  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);

  // 公告表单
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [submittingAnn, setSubmittingAnn] = useState(false);

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
        prev.map((a) => (a.id === ann.id ? { ...a, is_pinned: !a.is_pinned } : a))
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">管理后台</h1>

      {/* Tab 切换 */}
      <div className="flex gap-2 bg-white rounded-3xl shadow-sm p-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
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
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <span>{post.username || post.author}</span>
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
                    <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-primary-100 text-primary flex items-center justify-center font-semibold">
                      {(u.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {u.username}
                        </span>
                        {u.is_admin && (
                          <span className="text-xs bg-primary-50 text-primary px-2 py-0.5 rounded-full">
                            管理员
                          </span>
                        )}
                        {isMe && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            我
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        ID: {u.id}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteUser(u)}
                    disabled={disabled}
                    className="flex-shrink-0 p-2 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
                    title={
                      disabled ? (isMe ? '不能删除自己' : '不能删除其他管理员') : '删除'
                    }
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })
          )}
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

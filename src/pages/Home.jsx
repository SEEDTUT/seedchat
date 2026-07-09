import { useEffect, useState } from 'react';
import { Plus, Trash2, Pin, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { postsApi, announcementsApi } from '../api';
import { useStore } from '../store';
import { formatTime } from '../lib/time';

export default function Home() {
  const user = useStore((s) => s.user);
  const [posts, setPosts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [postsData, annData] = await Promise.all([
        postsApi.list(),
        announcementsApi.list(),
      ]);
      setPosts(postsData || []);
      setAnnouncements(annData || []);
    } catch (err) {
      toast.error(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('请填写标题和内容');
      return;
    }
    setSubmitting(true);
    try {
      const newPost = await postsApi.create({ title: title.trim(), content: content.trim() });
      setPosts((prev) => [newPost, ...prev]);
      setTitle('');
      setContent('');
      toast.success('发布成功');
    } catch (err) {
      toast.error(err.message || '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (post) => {
    if (!window.confirm(`确定要删除帖子「${post.title}」吗？`)) return;
    try {
      await postsApi.remove(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      toast.success('已删除');
    } catch (err) {
      toast.error(err.message || '删除失败');
    }
  };

  const pinnedAnnouncements = announcements.filter((a) => a.is_pinned);

  return (
    <div className="space-y-6">
      {/* 置顶公告区 */}
      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-3">
          {pinnedAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className="bg-yellow-50 border-2 border-yellow-200 rounded-3xl p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 bg-yellow-200 text-yellow-800 rounded-2xl p-1.5">
                  <Pin size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{ann.title}</h3>
                  <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap break-words">
                    {ann.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {formatTime(ann.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 发帖区域 */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Plus size={20} className="text-primary" />
          发布新帖子
        </h2>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="帖子标题"
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="说点什么吧..."
          rows={4}
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition resize-none"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-2xl bg-primary text-white font-medium hover:bg-primary-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus size={18} />
            {submitting ? '发布中...' : '发布'}
          </button>
        </div>
      </form>

      {/* 帖子列表 */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm p-12 text-center">
            <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">还没有帖子，快来发布第一条吧！</p>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-primary-100 text-primary flex items-center justify-center font-semibold">
                    {(post.username || post.author || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg break-words">
                      {post.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <span>{post.username || post.author}</span>
                      <span>·</span>
                      <span>{formatTime(post.created_at)}</span>
                    </div>
                  </div>
                </div>
                {(user?.is_admin || user?.id === post.user_id) && (
                  <button
                    onClick={() => handleDelete(post)}
                    className="flex-shrink-0 p-2 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                    title="删除"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <p className="text-gray-700 mt-3 whitespace-pre-wrap break-words leading-relaxed">
                {post.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Trash2,
  MessageSquare,
  MessageCircle,
  Send,
  Eye,
  Loader2,
  FileQuestion,
} from 'lucide-react';
import { toast } from 'sonner';
import { postsApi } from '../api';
import { useStore } from '../store';
import { formatTime } from '../lib/time';

// 内容中的 URL 解析为可点击链接（与 Home.jsx 保持一致）
const URL_REGEX =
  /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][-a-zA-Z0-9]*\.(com|net|org|io|cn|dev|app|co|me|xyz|info|tech)[^\s]*)/g;

function renderContentWithLinks(content) {
  if (!content) return null;
  const segments = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: content.slice(lastIndex, match.index),
        key: key++,
      });
    }
    const url = match[0];
    let href = url;
    if (url.startsWith('www.')) href = 'http://' + url;
    else if (!/^https?:\/\//i.test(url)) href = 'http://' + url;
    segments.push({ type: 'link', value: url, href, key: key++ });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.slice(lastIndex), key: key++ });
  }
  return segments.map((seg) =>
    seg.type === 'link' ? (
      <a
        key={seg.key}
        href={seg.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline break-all"
      >
        {seg.value}
      </a>
    ) : (
      <span key={seg.key}>{seg.value}</span>
    )
  );
}

function Avatar({ user, size = 'w-10 h-10' }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt=""
        className={`${size} rounded-2xl object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${size} rounded-2xl bg-primary-100 text-primary flex items-center justify-center font-semibold flex-shrink-0`}
    >
      {(user?.nickname || user?.username || '?').charAt(0).toUpperCase()}
    </div>
  );
}

function PostImage({ src }) {
  if (!src) return null;
  const isUrl = src.startsWith('http');
  return (
    <img
      src={src}
      alt="帖子图片"
      onClick={() => isUrl && window.open(src, '_blank')}
      className={`mt-3 max-w-full rounded-2xl object-cover ${
        isUrl ? 'cursor-pointer' : ''
      }`}
      style={{ maxHeight: '500px' }}
    />
  );
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <Loader2 size={40} className="animate-spin text-primary mb-3" />
      <p>加载中...</p>
    </div>
  );
}

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useStore((s) => s.user);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadPost = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const data = await postsApi.getDetail(id);
      setPost(data);
    } catch (err) {
      if (err.status === 404) {
        setNotFound(true);
      } else {
        toast.error(err.message || '加载失败');
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const data = await postsApi.listComments(id);
      setComments(data || []);
    } catch (err) {
      toast.error(err.message || '加载评论失败');
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    loadPost();
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const goHome = () => navigate('/');

  const openUserProfile = () => {
    if (post?.user_id) {
      navigate(`/user/${post.user_id}`);
    }
  };

  const openDM = () => {
    if (!post) return;
    if (post.user_id === user?.id) {
      toast.message('不能给自己发私信');
      return;
    }
    navigate('/friends', {
      state: {
        chatUser: {
          id: post.user_id,
          username: post.username,
          nickname: post.nickname,
          avatar: post.avatar,
        },
      },
    });
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const newComment = await postsApi.createComment(id, {
        content: commentText.trim(),
      });
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      setPost((prev) =>
        prev
          ? { ...prev, comment_count: (prev.comment_count || 0) + 1 }
          : prev
      );
    } catch (err) {
      toast.error(err.message || '评论失败');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (comment) => {
    if (!window.confirm('确定要删除这条评论吗？')) return;
    try {
      await postsApi.removeComment(id, comment.id);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      setPost((prev) =>
        prev
          ? {
              ...prev,
              comment_count: Math.max(0, (prev.comment_count || 0) - 1),
            }
          : prev
      );
      toast.success('已删除');
    } catch (err) {
      toast.error(err.message || '删除失败');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <button
          onClick={goHome}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-600 hover:bg-gray-100 transition text-sm"
        >
          <ArrowLeft size={18} />
          返回首页
        </button>
        <LoadingSpinner />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="space-y-4">
        <button
          onClick={goHome}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-600 hover:bg-gray-100 transition text-sm"
        >
          <ArrowLeft size={18} />
          返回首页
        </button>
        <div className="bg-white rounded-3xl shadow-sm p-12 text-center">
          <FileQuestion size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-lg">帖子不存在</p>
          <p className="text-gray-400 text-sm mt-1">
            该帖子可能已被删除或链接有误
          </p>
        </div>
      </div>
    );
  }

  const canDeletePost = user?.is_admin || user?.id === post.user_id;

  const handleDeletePost = async () => {
    if (!window.confirm(`确定要删除帖子「${post.title}」吗？`)) return;
    try {
      await postsApi.remove(post.id);
      toast.success('已删除');
      navigate('/');
    } catch (err) {
      toast.error(err.message || '删除失败');
    }
  };

  return (
    <div className="space-y-4">
      {/* 返回按钮 */}
      <button
        onClick={goHome}
        className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-600 hover:bg-gray-100 transition text-sm"
      >
        <ArrowLeft size={18} />
        返回首页
      </button>

      {/* 帖子主体 */}
      <div className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <button
              onClick={openUserProfile}
              title="查看主页"
              className="flex-shrink-0"
            >
              <Avatar
                user={{
                  username: post.username,
                  nickname: post.nickname,
                  avatar: post.avatar,
                }}
              />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-semibold text-gray-900 text-xl md:text-2xl break-words">
                {post.title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-1 flex-wrap">
                <button
                  onClick={openUserProfile}
                  className="font-medium text-gray-500 hover:text-primary transition"
                >
                  {post.nickname || post.username}
                </button>
                <span>·</span>
                <span>{formatTime(post.created_at)}</span>
                {typeof post.view_count === 'number' && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Eye size={13} />
                      {post.view_count} 次浏览
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {canDeletePost && (
            <button
              onClick={handleDeletePost}
              className="flex-shrink-0 p-2 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
              title="删除帖子"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>

        <div className="text-gray-700 mt-4 whitespace-pre-wrap break-words leading-relaxed">
          {renderContentWithLinks(post.content)}
        </div>

        <PostImage src={post.image} />

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={openDM}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-sm text-gray-500 hover:bg-gray-100 transition"
          >
            <MessageSquare size={16} />
            私信
          </button>
        </div>
      </div>

      {/* 评论区（始终展开） */}
      <div className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <MessageCircle size={20} className="text-primary" />
          评论 {post.comment_count ? `(${post.comment_count})` : ''}
        </h2>

        <div className="space-y-3">
          {loadingComments ? (
            <div className="text-center py-4 text-gray-400 text-sm">
              加载中...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              还没有评论，来说点什么吧
            </div>
          ) : (
            comments.map((c) => {
              const canDelComment =
                user?.is_admin || user?.id === c.user_id;
              return (
                <div key={c.id} className="flex items-start gap-3 group">
                  <Avatar
                    user={{
                      username: c.username,
                      nickname: c.nickname,
                      avatar: c.avatar,
                    }}
                    size="w-8 h-8"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">
                        {c.nickname || c.username}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(c.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">
                      {c.content}
                    </p>
                  </div>
                  {canDelComment && (
                    <button
                      onClick={() => handleDeleteComment(c)}
                      className="flex-shrink-0 p-1 rounded-xl text-gray-300 hover:bg-red-50 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                      title="删除评论"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 评论输入 */}
        <form
          onSubmit={handleAddComment}
          className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-100"
        >
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="写下你的评论..."
            className="flex-1 min-w-0 px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition text-sm"
          />
          <button
            type="submit"
            disabled={submittingComment || !commentText.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-2xl bg-primary text-white hover:bg-primary-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

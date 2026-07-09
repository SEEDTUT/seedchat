import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Pin,
  MessageSquare,
  Image as ImageIcon,
  X,
  Send,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { postsApi, announcementsApi, uploadApi } from '../api';
import { useStore } from '../store';
import { formatTime } from '../lib/time';
import { shortUid } from '../lib/uid';
import DefaultAvatar from '../components/DefaultAvatar';
import { NameplateBadge } from '../components/Nameplate';

// 图片压缩：限制最大宽度/高度
function compressImage(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

// 内容中的 URL 解析为可点击链接
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

function Avatar({ user, size = 40 }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt=""
        className="rounded-2xl object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return <DefaultAvatar seed={user?.id} size={size} />;
}

function PostImage({ src }) {
  if (!src) return null;
  const isUrl = src.startsWith('http');
  return (
    <img
      src={src}
      alt="帖子图片"
      onClick={() => isUrl && window.open(src, '_blank')}
      className={`mt-3 max-w-full rounded-2xl object-cover cursor-zoom-in ${
        isUrl ? 'cursor-pointer' : ''
      }`}
      style={{ maxHeight: '500px' }}
    />
  );
}

function PostCard({ post, onDelete }) {
  const user = useStore((s) => s.user);
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const canDelete = user?.is_admin || user?.id === post.user_id;

  const openDM = () => {
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

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const data = await postsApi.listComments(post.id);
      setComments(data || []);
    } catch (err) {
      toast.error(err.message || '加载评论失败');
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && comments.length === 0) {
      loadComments();
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const newComment = await postsApi.createComment(post.id, {
        content: commentText.trim(),
      });
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      // 更新评论计数
      post.comment_count = (post.comment_count || 0) + 1;
    } catch (err) {
      toast.error(err.message || '评论失败');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (comment) => {
    if (!window.confirm('确定要删除这条评论吗？')) return;
    try {
      await postsApi.removeComment(post.id, comment.id);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      post.comment_count = Math.max(0, (post.comment_count || 0) - 1);
      toast.success('已删除');
    } catch (err) {
      toast.error(err.message || '删除失败');
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <button onClick={openDM} title="私信" className="flex-shrink-0">
            <Avatar
              user={{
                id: post.user_id,
                username: post.username,
                nickname: post.nickname,
                avatar: post.avatar,
              }}
            />
          </button>
          <div className="min-w-0 flex-1">
            <button
              onClick={() => navigate(`/post/${post.id}`)}
              className="text-left w-full"
              title="查看详情"
            >
              <h3 className="font-semibold text-gray-900 text-lg break-words hover:text-primary transition">
                {post.title}
              </h3>
            </button>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
              <span className="font-medium text-gray-500">
                {post.nickname || post.username}
              </span>
              <NameplateBadge obj={post} />
              <span>@{shortUid(post.user_id)}</span>
              <span>·</span>
              <span>{formatTime(post.created_at)}</span>
            </div>
          </div>
        </div>
        {canDelete && (
          <button
            onClick={() => onDelete(post)}
            className="flex-shrink-0 p-2 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
            title="删除"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <div className="text-gray-700 mt-3 whitespace-pre-wrap break-words leading-relaxed">
        {renderContentWithLinks(post.content)}
      </div>

      <PostImage src={post.image} />

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={() => navigate(`/post/${post.id}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-sm text-primary hover:bg-primary-50 transition"
        >
          <ExternalLink size={16} />
          查看详情
        </button>
        <button
          onClick={toggleComments}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-sm transition ${
            expanded
              ? 'bg-primary-50 text-primary'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <MessageCircle size={16} />
          评论 {post.comment_count ? `(${post.comment_count})` : ''}
        </button>
        <button
          onClick={openDM}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-sm text-gray-500 hover:bg-gray-100 transition"
        >
          <MessageSquare size={16} />
          私信
        </button>
      </div>

      {/* 评论区 */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          {loadingComments ? (
            <div className="text-center py-4 text-gray-400 text-sm">
              加载中...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-4 text-gray-400 text-sm">
              还没有评论，来说点什么吧
            </div>
          ) : (
            comments.map((c) => {
              const canDelComment =
                user?.is_admin || user?.id === c.user_id;
              return (
                <div
                  key={c.id}
                  className="flex items-start gap-3 group"
                >
                  <Avatar
                    user={{
                      id: c.user_id,
                      username: c.username,
                      nickname: c.nickname,
                      avatar: c.avatar,
                    }}
                    size={32}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">
                        {c.nickname || c.username}
                      </span>
                      <NameplateBadge obj={c} />
                      <span className="text-xs text-gray-400">
                        @{shortUid(c.user_id)}
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

          {/* 评论输入 */}
          <form
            onSubmit={handleAddComment}
            className="flex items-center gap-2 pt-2"
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
      )}
    </div>
  );
}

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const imageInputRef = useRef(null);
  const isAdminMode = useStore((s) => s.is_admin_mode);

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

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }
    try {
      const base64 = await compressImage(file, 800);
      setImage(base64);
    } catch (err) {
      toast.error(err.message || '图片处理失败');
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('请填写标题和内容');
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl = undefined;
      // 如果有图片，先上传到 ImgBB，拿到 URL 再发布帖子
      if (image) {
        const uploadRes = await uploadApi.image(image);
        imageUrl = uploadRes.url;
      }
      const newPost = await postsApi.create({
        title: title.trim(),
        content: content.trim(),
        image: imageUrl,
      });
      setPosts((prev) => [newPost, ...prev]);
      setTitle('');
      setContent('');
      setImage('');
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

      {/* 发帖区域（管理员模式下隐藏，管理员不能发帖） */}
      {!isAdminMode && (
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

        {/* 图片上传与预览 */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
        {image ? (
          <div className="relative inline-block">
            <img
              src={image}
              alt="预览"
              className="max-h-48 rounded-2xl object-cover"
            />
            <button
              type="button"
              onClick={() => setImage('')}
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition"
              title="移除图片"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-dashed border-gray-300 text-gray-500 hover:border-primary hover:text-primary transition text-sm"
          >
            <ImageIcon size={18} />
            添加图片（可选）
          </button>
        )}

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
      )}

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
            <PostCard key={post.id} post={post} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  );
}

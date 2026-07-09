import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Send,
  ImageIcon,
  Video,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { messagesApi, friendsApi, uploadApi } from '../api';
import { useStore } from '../store';
import { formatTime } from '../lib/time';
import { shortUid } from '../lib/uid';
import UserAvatar from '../components/UserAvatar';
import { NameplateBadge } from '../components/Nameplate';

// 图片压缩
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

function renderMessageBody(m, isMine) {
  if (m.type === 'image') {
    const isUrl = (m.content || '').startsWith('http');
    return (
      <img
        src={m.content}
        alt="图片"
        onClick={() => isUrl && window.open(m.content, '_blank')}
        className={`block max-w-[260px] max-h-[260px] rounded-2xl object-cover ${
          isUrl ? 'cursor-pointer' : ''
        }`}
      />
    );
  }
  if (m.type === 'video') {
    return (
      <video
        src={m.content}
        controls
        className="block max-w-[280px] max-h-[280px] rounded-2xl"
      />
    );
  }
  return <p className="whitespace-pre-wrap break-words">{m.content}</p>;
}

export default function Messages() {
  const user = useStore((s) => s.user);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('to');

  const [chatTarget, setChatTarget] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const lastTimestampRef = useRef('');
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // 加载聊天对象信息和消息
  useEffect(() => {
    if (!targetUserId) {
      navigate('/friends');
      return;
    }

    let cancelled = false;

    const init = async () => {
      setLoading(true);
      try {
        // 获取用户信息
        const allUsers = await friendsApi.users();
        const target = allUsers.find((u) => u.id === targetUserId);

        if (!target) {
          toast.error('用户不存在');
          navigate('/friends');
          return;
        }

        if (cancelled) return;

        setChatTarget({
          id: target.id,
          username: target.username,
          nickname: target.nickname,
          avatar: target.avatar,
          active_nameplate: target.active_nameplate,
          is_online: target.is_online,
          is_mutual: !!target.is_mutual,
        });

        // 加载消息
        const data = await messagesApi.list(targetUserId);
        if (cancelled) return;
        const list = data || [];
        setMessages(list);
        const maxTime = list.reduce(
          (max, m) => (m.created_at > max ? m.created_at : max),
          ''
        );
        lastTimestampRef.current = maxTime || new Date().toISOString();

        // 单条消息限制检查
        if (!target.is_mutual) {
          const sentByMe = list.some((m) => m.sender_id === user?.id);
          if (sentByMe) setChatDisabled(true);
        }
      } catch (err) {
        if (!cancelled) toast.error(err.message || '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, uploadingImage]);

  // 轮询新消息
  useEffect(() => {
    if (!chatTarget) return;
    const targetId = chatTarget.id;
    const poll = async () => {
      try {
        const after = lastTimestampRef.current;
        if (!after) return;
        const newMsgs = await messagesApi.getNew(targetId, after);
        if (newMsgs && newMsgs.length > 0) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const toAdd = newMsgs.filter((m) => !ids.has(m.id));
            return [...prev, ...toAdd];
          });
          const maxTime = newMsgs.reduce(
            (max, m) => (m.created_at > max ? m.created_at : max),
            lastTimestampRef.current
          );
          lastTimestampRef.current = maxTime;
        }
      } catch {
        // 静默
      }
    };
    const timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, [chatTarget]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!content.trim() || !chatTarget || sending || chatDisabled) return;
    const text = content.trim();
    setContent('');
    setSending(true);
    try {
      const newMsg = await messagesApi.send(chatTarget.id, {
        content: text,
        type: 'text',
      });
      setMessages((prev) => {
        // 如果有 AI 回复，同时添加用户消息和 AI 回复
        if (newMsg.ai_reply) {
          return [...prev, newMsg, newMsg.ai_reply];
        }
        return [...prev, newMsg];
      });
      if (newMsg.created_at > lastTimestampRef.current) {
        lastTimestampRef.current = newMsg.created_at;
      }
      if (!chatTarget.is_mutual) setChatDisabled(true);
    } catch (err) {
      if (err.code === 'SINGLE_MESSAGE_LIMIT') {
        toast.error('对方还未关注你，你只能发送一条消息');
        setChatDisabled(true);
      } else {
        toast.error(err.message || '发送失败');
      }
      setContent(text);
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !chatTarget || chatDisabled) return;
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }
    setSending(true);
    setUploadingImage(true);
    try {
      const base64 = await compressImage(file, 800);
      const uploadRes = await uploadApi.image(base64);
      const url = uploadRes.url;
      const newMsg = await messagesApi.send(chatTarget.id, {
        content: url,
        type: 'image',
      });
      setMessages((prev) => [...prev, newMsg]);
      if (newMsg.created_at > lastTimestampRef.current) {
        lastTimestampRef.current = newMsg.created_at;
      }
      if (!chatTarget.is_mutual) setChatDisabled(true);
    } catch (err) {
      if (err.code === 'SINGLE_MESSAGE_LIMIT') {
        toast.error('对方还未关注你，你只能发送一条消息');
        setChatDisabled(true);
      } else {
        toast.error(err.message || '图片发送失败');
      }
    } finally {
      setSending(false);
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !chatTarget || chatDisabled) return;
    if (!file.type.startsWith('video/')) {
      toast.error('请选择视频文件');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('视频不能超过5MB');
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }
    setSending(true);
    try {
      const base64 = await fileToBase64(file);
      const newMsg = await messagesApi.send(chatTarget.id, {
        content: base64,
        type: 'video',
      });
      setMessages((prev) => [...prev, newMsg]);
      if (newMsg.created_at > lastTimestampRef.current) {
        lastTimestampRef.current = newMsg.created_at;
      }
      if (!chatTarget.is_mutual) setChatDisabled(true);
    } catch (err) {
      if (err.code === 'SINGLE_MESSAGE_LIMIT') {
        toast.error('对方还未关注你，你只能发送一条消息');
        setChatDisabled(true);
      } else {
        toast.error(err.message || '视频发送失败');
      }
    } finally {
      setSending(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/friends')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-600 hover:bg-gray-100 transition text-sm"
        >
          <ArrowLeft size={18} />
          返回好友
        </button>
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 size={40} className="animate-spin text-primary mb-3" />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (!chatTarget) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/friends')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-600 hover:bg-gray-100 transition text-sm"
        >
          <ArrowLeft size={18} />
          返回好友
        </button>
        <div className="bg-white rounded-3xl shadow-sm p-12 text-center">
          <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">对话不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate('/friends')}
        className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-600 hover:bg-gray-100 transition text-sm"
      >
        <ArrowLeft size={18} />
        返回好友
      </button>

      {/* 聊天主体 - 全页面卡片 */}
      <div className="bg-white rounded-3xl shadow-sm flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 12rem)' }}>
        {/* 头部 */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 flex-shrink-0">
          <UserAvatar user={chatTarget} size={44} showOnline />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
              <span className="truncate">
                {chatTarget.nickname || chatTarget.username}
              </span>
              <NameplateBadge obj={chatTarget} />
            </div>
            <div className="text-xs text-gray-400 truncate">
              @{shortUid(chatTarget.id)}
              {chatTarget.is_online ? (
                <span className="text-green-500 ml-2">在线</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* 非互关警告 */}
        {!chatTarget.is_mutual && (
          <div className="flex items-start gap-2 px-4 py-2.5 bg-yellow-50 border-b border-yellow-100 text-yellow-800 text-xs flex-shrink-0">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
            <span>对方还未关注你，你只能发送一条消息</span>
          </div>
        )}
        {chatDisabled && chatTarget.is_mutual === false && (
          <div className="flex items-start gap-2 px-4 py-2.5 bg-red-50 border-b border-red-100 text-red-700 text-xs flex-shrink-0">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
            <span>已达到单条消息上限，对方关注你后可继续发送</span>
          </div>
        )}

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/60 min-h-0">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              还没有消息，发送第一条消息吧
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === user?.id;
              const isMedia = m.type === 'image' || m.type === 'video';
              return (
                <div
                  key={m.id}
                  className={`flex animate-fade-in-up ${
                    isMine ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`${
                      isMedia ? 'p-1' : 'px-4 py-2.5'
                    } max-w-[80%] rounded-3xl ${
                      isMedia
                        ? isMine
                          ? 'bg-primary-50'
                          : 'bg-white shadow-sm'
                        : isMine
                        ? 'bg-primary text-white rounded-br-md'
                        : 'bg-white text-gray-900 shadow-sm rounded-bl-md'
                    }`}
                  >
                    {renderMessageBody(m, isMine)}
                    <p
                      className={`text-[10px] mt-1 ${
                        isMedia
                          ? 'text-gray-400 text-center'
                          : isMine
                          ? 'text-primary-100'
                          : 'text-gray-400'
                      }`}
                    >
                      {formatTime(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          {uploadingImage && (
            <div className="flex justify-end">
              <div className="px-4 py-2.5 max-w-[80%] rounded-3xl bg-primary text-white rounded-br-md">
                <p className="text-sm">上传中...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区 */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t border-gray-100 flex items-center gap-2 flex-shrink-0"
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={sending || chatDisabled}
            className="flex-shrink-0 w-10 h-10 rounded-2xl text-gray-500 hover:bg-gray-100 transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            title="发送图片"
          >
            <ImageIcon size={20} />
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={sending || chatDisabled}
            className="flex-shrink-0 w-10 h-10 rounded-2xl text-gray-500 hover:bg-gray-100 transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            title="发送视频"
          >
            <Video size={20} />
          </button>
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={chatDisabled ? '无法继续发送' : '输入消息...'}
            disabled={chatDisabled}
            className="flex-1 min-w-0 px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={sending || !content.trim() || chatDisabled}
            className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary text-white hover:bg-primary-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}

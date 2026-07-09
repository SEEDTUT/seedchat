import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Send,
  ImageIcon,
  Video,
  ArrowLeft,
  AlertTriangle,
  Search,
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
        className={`block max-w-[220px] max-h-[220px] rounded-2xl object-cover ${
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
        className="block max-w-[240px] max-h-[240px] rounded-2xl"
      />
    );
  }
  return <p className="whitespace-pre-wrap break-words">{m.content}</p>;
}

export default function Messages() {
  const user = useStore((s) => s.user);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const lastTimestampRef = useRef('');
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // 加载会话列表
  const loadConversations = useCallback(async () => {
    try {
      const data = await messagesApi.conversations();
      setConversations(data || []);
    } catch {
      // 静默
    } finally {
      setLoadingConv(false);
    }
  }, []);

  // 加载全部用户（用于搜索发起新对话）
  const loadUsers = useCallback(async () => {
    try {
      const data = await friendsApi.users();
      setAllUsers(data || []);
    } catch {
      // 静默
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadUsers();
  }, [loadConversations, loadUsers]);

  // 打开聊天
  const openChat = useCallback(
    async (target) => {
      setActiveChat(target);
      setMessages([]);
      setContent('');
      setChatDisabled(false);
      setLoadingMsg(true);
      setSearchParams({});
      try {
        const data = await messagesApi.list(target.id);
        const list = data || [];
        setMessages(list);
        const maxTime = list.reduce(
          (max, m) => (m.created_at > max ? m.created_at : max),
          ''
        );
        lastTimestampRef.current = maxTime || new Date().toISOString();

        if (!target.is_mutual) {
          const sentByMe = list.some((m) => m.sender_id === user?.id);
          if (sentByMe) setChatDisabled(true);
        }
      } catch (err) {
        toast.error(err.message || '加载消息失败');
      } finally {
        setLoadingMsg(false);
      }
    },
    [setSearchParams, user?.id]
  );

  // 处理从其他页面跳转来的 ?to=userId
  useEffect(() => {
    const toUserId = searchParams.get('to');
    if (toUserId && !activeChat) {
      // 先从会话列表找
      const existing = conversations.find((c) => c.id === toUserId);
      if (existing) {
        openChat(existing);
      } else {
        // 从全部用户找
        const found = allUsers.find((u) => u.id === toUserId);
        if (found) {
          openChat({
            id: found.id,
            username: found.username,
            nickname: found.nickname,
            avatar: found.avatar,
            active_nameplate: found.active_nameplate,
            is_online: found.is_online,
            is_mutual: !!found.is_mutual,
          });
        } else {
          // 还没加载完，等一下
          if (allUsers.length === 0) return;
          // 用户不存在
          toast.error('用户不存在');
          setSearchParams({});
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, conversations, allUsers, activeChat]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, uploadingImage]);

  // 轮询新消息
  useEffect(() => {
    if (!activeChat) return;
    const targetId = activeChat.id;
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
  }, [activeChat]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!content.trim() || !activeChat || sending || chatDisabled) return;
    const text = content.trim();
    setContent('');
    setSending(true);
    try {
      const newMsg = await messagesApi.send(activeChat.id, {
        content: text,
        type: 'text',
      });
      setMessages((prev) => [...prev, newMsg]);
      if (newMsg.created_at > lastTimestampRef.current) {
        lastTimestampRef.current = newMsg.created_at;
      }
      if (!activeChat.is_mutual) setChatDisabled(true);
      // 刷新会话列表
      loadConversations();
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
    if (!file || !activeChat || chatDisabled) return;
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
      const newMsg = await messagesApi.send(activeChat.id, {
        content: url,
        type: 'image',
      });
      setMessages((prev) => [...prev, newMsg]);
      if (newMsg.created_at > lastTimestampRef.current) {
        lastTimestampRef.current = newMsg.created_at;
      }
      if (!activeChat.is_mutual) setChatDisabled(true);
      loadConversations();
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
    if (!file || !activeChat || chatDisabled) return;
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
      const newMsg = await messagesApi.send(activeChat.id, {
        content: base64,
        type: 'video',
      });
      setMessages((prev) => [...prev, newMsg]);
      if (newMsg.created_at > lastTimestampRef.current) {
        lastTimestampRef.current = newMsg.created_at;
      }
      if (!activeChat.is_mutual) setChatDisabled(true);
      loadConversations();
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

  // 关闭聊天，回到列表
  const closeChat = () => {
    setActiveChat(null);
    setMessages([]);
    setContent('');
    setChatDisabled(false);
    lastTimestampRef.current = '';
    loadConversations();
  };

  // 合并会话列表和搜索结果
  const convIds = new Set(conversations.map((c) => c.id));
  const searchResults = allUsers.filter((u) => {
    if (convIds.has(u.id)) return false;
    if (u.id === user?.id) return false;
    const kw = searchKeyword.toLowerCase();
    return (
      (u.username || '').toLowerCase().includes(kw) ||
      (u.nickname || '').toLowerCase().includes(kw)
    );
  });

  // 移动端：如果有 activeChat，只显示聊天面板
  const showChatOnMobile = !!activeChat;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
      {/* 双栏布局：桌面端左右分栏，移动端单栏切换 */}
      <div className="flex gap-4 h-full min-h-0">
        {/* 左侧：会话列表 */}
        <div
          className={`${
            showChatOnMobile ? 'hidden md:flex' : 'flex'
          } flex-col w-full md:w-80 lg:w-96 bg-white rounded-3xl shadow-sm overflow-hidden flex-shrink-0`}
        >
          <div className="p-4 border-b border-gray-100">
            <h1 className="text-lg font-bold text-gray-900 mb-3">私信</h1>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索用户..."
                className="w-full pl-9 pr-3 py-2 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConv ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                加载中...
              </div>
            ) : conversations.length === 0 && searchResults.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm px-4">
                <MessageSquare
                  size={36}
                  className="mx-auto mb-2 text-gray-300"
                />
                {searchKeyword
                  ? '没有找到匹配的用户'
                  : '还没有会话，搜索用户开始聊天吧'}
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {/* 已有会话 */}
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => openChat(c)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition text-left ${
                      activeChat?.id === c.id
                        ? 'bg-primary-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <UserAvatar user={c} size={44} showOnline />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate text-sm">
                          {c.nickname || c.username}
                        </span>
                        <NameplateBadge obj={c} />
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {c.last_message_type === 'image'
                          ? '[图片]'
                          : c.last_message_type === 'video'
                          ? '[视频]'
                          : c.last_message || '点击查看消息'}
                      </p>
                    </div>
                    {c.last_message_at && (
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {formatTime(c.last_message_at)}
                      </span>
                    )}
                  </button>
                ))}

                {/* 搜索结果：还未有会话的用户 */}
                {searchResults.length > 0 && (
                  <>
                    {searchResults.length > 0 && conversations.length > 0 && (
                      <div className="px-3 py-1.5 text-xs text-gray-400 font-medium">
                        更多用户
                      </div>
                    )}
                    {searchResults.slice(0, 20).map((u) => (
                      <button
                        key={u.id}
                        onClick={() =>
                          openChat({
                            id: u.id,
                            username: u.username,
                            nickname: u.nickname,
                            avatar: u.avatar,
                            active_nameplate: u.active_nameplate,
                            is_online: u.is_online,
                            is_mutual: !!u.is_mutual,
                          })
                        }
                        className="w-full flex items-center gap-3 p-3 rounded-2xl transition text-left hover:bg-gray-50"
                      >
                        <UserAvatar user={u} size={44} showOnline />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate text-sm">
                              {u.nickname || u.username}
                            </span>
                            <NameplateBadge obj={u} />
                          </div>
                          <span className="text-xs text-gray-400">
                            @{shortUid(u.id)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：聊天面板 */}
        <div
          className={`${
            showChatOnMobile ? 'flex' : 'hidden md:flex'
          } flex-col flex-1 bg-white rounded-3xl shadow-sm overflow-hidden min-w-0`}
        >
          {activeChat ? (
            <>
              {/* 头部 */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-100 flex-shrink-0">
                <button
                  onClick={closeChat}
                  className="p-1.5 rounded-2xl hover:bg-gray-100 transition md:hidden"
                >
                  <ArrowLeft size={20} />
                </button>
                <UserAvatar user={activeChat} size={40} showOnline />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
                    <span className="truncate">
                      {activeChat.nickname || activeChat.username}
                    </span>
                    <NameplateBadge obj={activeChat} />
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    @{shortUid(activeChat.id)}
                    {activeChat.is_online ? (
                      <span className="text-green-500 ml-2">在线</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* 非互关警告 */}
              {!activeChat.is_mutual && (
                <div className="flex items-start gap-2 px-4 py-2.5 bg-yellow-50 border-b border-yellow-100 text-yellow-800 text-xs flex-shrink-0">
                  <AlertTriangle
                    size={15}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <span>对方还未关注你，你只能发送一条消息</span>
                </div>
              )}
              {chatDisabled && activeChat.is_mutual === false && (
                <div className="flex items-start gap-2 px-4 py-2.5 bg-red-50 border-b border-red-100 text-red-700 text-xs flex-shrink-0">
                  <AlertTriangle
                    size={15}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <span>
                    已达到单条消息上限，对方关注你后可继续发送
                  </span>
                </div>
              )}

              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/60 min-h-0">
                {loadingMsg ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    加载中...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    还没有消息，发送第一条消息吧
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender_id === user?.id;
                    const isMedia =
                      m.type === 'image' || m.type === 'video';
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
            </>
          ) : (
            // 未选择聊天时的占位
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center text-gray-400">
                <MessageSquare size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm">选择一个会话开始聊天</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

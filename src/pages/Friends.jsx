import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  UserPlus,
  UserMinus,
  Users,
  ArrowLeft,
  Send,
  ImageIcon,
  Video,
  Ban,
  ShieldOff,
  MessageSquare,
  AlertTriangle,
  X,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { friendsApi, messagesApi, uploadApi } from '../api';
import { useStore } from '../store';
import { formatTime } from '../lib/time';
import { shortUid } from '../lib/uid';
import DefaultAvatar from '../components/DefaultAvatar';
import { NameplateBadge } from '../components/Nameplate';
import NameplateManager from '../components/NameplateManager';

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

// 视频转 base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

function Avatar({ user, size = 44 }) {
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

export default function Friends() {
  const user = useStore((s) => s.user);
  const location = useLocation();
  const navigate = useNavigate();

  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [users, setUsers] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  // 聊天面板状态
  const [chatTarget, setChatTarget] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const lastTimestampRef = useRef('');
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [friendsData, usersData, blockedData] = await Promise.all([
        friendsApi.list(),
        friendsApi.users(),
        friendsApi.blocked(),
      ]);
      setFriends(friendsData || []);
      setUsers(usersData || []);
      setBlocked(blockedData || []);
    } catch (err) {
      toast.error(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, uploadingImage]);

  // 解析从首页带来的私信目标
  useEffect(() => {
    const state = location.state;
    if (state?.chatUser) {
      const cu = state.chatUser;
      // 清除 state，避免刷新重复触发
      navigate(location.pathname, { replace: true, state: null });
      // 在 users 列表中查找 is_mutual
      const found = users.find((u) => u.id === cu.id);
      openChat({
        id: cu.id,
        username: cu.username,
        nickname: cu.nickname,
        avatar: cu.avatar,
        is_mutual: found ? !!found.is_mutual : false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, users]);

  const openChat = async (target) => {
    setChatTarget(target);
    setMessages([]);
    setContent('');
    setChatDisabled(false);
    setLoadingMsg(true);
    try {
      const data = await messagesApi.list(target.id);
      const list = data || [];
      setMessages(list);
      const maxTime = list.reduce(
        (max, m) => (m.created_at > max ? m.created_at : max),
        ''
      );
      lastTimestampRef.current = maxTime || new Date().toISOString();

      // 单条消息限制：非互关且已发过消息 -> 禁用
      if (!target.is_mutual) {
        const sentByMe = list.some((m) => m.sender_id === user?.id);
        if (sentByMe) setChatDisabled(true);
      }
    } catch (err) {
      toast.error(err.message || '加载消息失败');
    } finally {
      setLoadingMsg(false);
    }
  };

  const closeChat = () => {
    setChatTarget(null);
    setMessages([]);
    setContent('');
    setChatDisabled(false);
    lastTimestampRef.current = '';
  };

  // 每 3 秒轮询新消息
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
      setMessages((prev) => [...prev, newMsg]);
      if (newMsg.created_at > lastTimestampRef.current) {
        lastTimestampRef.current = newMsg.created_at;
      }
      // 非互关，单条限制：发完即禁用
      if (!chatTarget.is_mutual) {
        setChatDisabled(true);
      }
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
      // 先上传到 ImgBB，拿到 URL 后再发送图片消息
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

  const handleAdd = async (userId) => {
    try {
      await friendsApi.add(userId);
      await loadData();
      toast.success('关注成功');
    } catch (err) {
      toast.error(err.message || '操作失败');
    }
  };

  const handleRemove = async (userId) => {
    try {
      await friendsApi.remove(userId);
      await loadData();
      toast.success('已取消关注');
    } catch (err) {
      toast.error(err.message || '操作失败');
    }
  };

  const handleBlock = async (userId) => {
    if (!window.confirm('确定要拉黑该用户吗？')) return;
    try {
      await friendsApi.block(userId);
      await loadData();
      toast.success('已拉黑');
    } catch (err) {
      toast.error(err.message || '操作失败');
    }
  };

  const handleUnblock = async (userId) => {
    try {
      await friendsApi.unblock(userId);
      await loadData();
      toast.success('已取消拉黑');
    } catch (err) {
      toast.error(err.message || '操作失败');
    }
  };

  const mutualFriends = friends.filter((f) => f.is_mutual);
  const oneWayFriends = friends.filter((f) => !f.is_mutual);

  const filteredUsers = users.filter((u) => {
    const kw = keyword.toLowerCase();
    return (
      (u.username || '').toLowerCase().includes(kw) ||
      (u.nickname || '').toLowerCase().includes(kw)
    );
  });

  const tabClass = (active) =>
    `flex items-center gap-2 px-5 py-2.5 rounded-2xl font-medium whitespace-nowrap transition ${
      active ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">好友</h1>

      {/* 我的铭牌管理（当前用户可在此选择佩戴铭牌） */}
      <div className="bg-white rounded-3xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Tag size={18} className="text-primary" />
          我的铭牌
        </h2>
        <NameplateManager />
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 bg-white rounded-3xl shadow-sm p-2 overflow-x-auto">
        <button onClick={() => setTab('friends')} className={tabClass(tab === 'friends')}>
          <Users size={18} />
          好友列表
        </button>
        <button onClick={() => setTab('users')} className={tabClass(tab === 'users')}>
          <Search size={18} />
          所有用户
        </button>
      </div>

      {/* 好友列表 Tab */}
      {tab === 'friends' && (
        <div className="space-y-6">
          {/* 互关好友 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
              互关好友 ({mutualFriends.length})
            </h2>
            {loading ? (
              <div className="text-center py-8 text-gray-400">加载中...</div>
            ) : mutualFriends.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm p-8 text-center text-gray-400">
                还没有互关好友
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mutualFriends.map((f) => (
                  <div
                    key={f.id}
                    className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button onClick={() => openChat(f)} title="私信">
                        <Avatar user={f} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 truncate">
                            {f.nickname || f.username}
                          </span>
                          <NameplateBadge obj={f} />
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">
                            互关
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 truncate block">
                          @{shortUid(f.id)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={() => openChat(f)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-2xl text-sm bg-primary text-white hover:bg-primary-700 transition"
                      >
                        <MessageSquare size={15} />
                        私信
                      </button>
                      <button
                        onClick={() => handleRemove(f.id)}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-2xl text-sm text-gray-500 hover:bg-gray-100 transition"
                      >
                        <UserMinus size={15} />
                        取关
                      </button>
                      <button
                        onClick={() => handleBlock(f.id)}
                        className="p-1.5 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                        title="拉黑"
                      >
                        <Ban size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 关注的人 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" />
              关注的人 ({oneWayFriends.length})
            </h2>
            {loading ? (
              <div className="text-center py-8 text-gray-400">加载中...</div>
            ) : oneWayFriends.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm p-8 text-center text-gray-400">
                还没有单向关注的人
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {oneWayFriends.map((f) => (
                  <div
                    key={f.id}
                    className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button onClick={() => openChat(f)} title="私信">
                        <Avatar user={f} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 truncate">
                            {f.nickname || f.username}
                          </span>
                          <NameplateBadge obj={f} />
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">
                            关注
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 truncate block">
                          @{shortUid(f.id)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={() => openChat(f)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-2xl text-sm bg-primary text-white hover:bg-primary-700 transition"
                      >
                        <MessageSquare size={15} />
                        私信
                      </button>
                      <button
                        onClick={() => handleRemove(f.id)}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-2xl text-sm text-gray-500 hover:bg-gray-100 transition"
                      >
                        <UserMinus size={15} />
                        取关
                      </button>
                      <button
                        onClick={() => handleBlock(f.id)}
                        className="p-1.5 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                        title="拉黑"
                      >
                        <Ban size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 拉黑用户 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <ShieldOff size={20} className="text-red-400" />
              已拉黑用户 ({blocked.length})
            </h2>
            {loading ? (
              <div className="text-center py-8 text-gray-400">加载中...</div>
            ) : blocked.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm p-8 text-center text-gray-400">
                没有拉黑任何用户
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {blocked.map((b) => (
                  <div
                    key={b.id}
                    className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar user={b} />
                      <div className="min-w-0">
                        <span className="font-medium text-gray-900 truncate block">
                          {b.nickname || b.username}
                        </span>
                        <span className="text-xs text-gray-400 truncate block">
                          @{shortUid(b.id)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblock(b.id)}
                      className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-2xl text-sm text-gray-500 hover:bg-gray-100 transition"
                    >
                      <ShieldOff size={15} />
                      取消拉黑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 所有用户 Tab */}
      {tab === 'users' && (
        <section>
          <div className="bg-white rounded-3xl shadow-sm p-5 mb-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索用户名或昵称..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">加载中...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-sm p-8 text-center text-gray-400">
              没有找到匹配的用户
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((u) => {
                const isMe = u.id === user?.id;
                const following = !!u.is_friend;
                return (
                  <div
                    key={u.id}
                    className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar user={u} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 truncate">
                            {u.nickname || u.username}
                          </span>
                          <NameplateBadge obj={u} />
                          {isMe && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                              我
                            </span>
                          )}
                          {u.is_mutual && !isMe && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              互关
                            </span>
                          )}
                          {u.is_blocked && !isMe && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                              已拉黑
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 truncate block">
                          @{shortUid(u.id)}
                        </span>
                      </div>
                    </div>
                    {!isMe && (
                      <div className="flex items-center gap-2 mt-4">
                        {following ? (
                          <>
                            <button
                              onClick={() =>
                                openChat({
                                  id: u.id,
                                  username: u.username,
                                  nickname: u.nickname,
                                  avatar: u.avatar,
                                  is_mutual: !!u.is_mutual,
                                })
                              }
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-2xl text-sm bg-primary text-white hover:bg-primary-700 transition"
                            >
                              <MessageSquare size={15} />
                              私信
                            </button>
                            <button
                              onClick={() => handleRemove(u.id)}
                              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-2xl text-sm text-gray-500 hover:bg-gray-100 transition"
                            >
                              <UserMinus size={15} />
                              取关
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleAdd(u.id)}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-2xl text-sm bg-primary text-white hover:bg-primary-700 transition"
                          >
                            <UserPlus size={15} />
                            关注
                          </button>
                        )}
                        <button
                          onClick={() => handleBlock(u.id)}
                          className="p-1.5 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                          title="拉黑"
                        >
                          <Ban size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 聊天面板：右侧抽屉（桌面）/ 全屏（移动） */}
      {chatTarget && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          {/* 遮罩 */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={closeChat}
          />
          {/* 面板 */}
          <div className="relative w-full md:w-[420px] h-full bg-white shadow-2xl flex flex-col">
            {/* 头部 */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-100">
              <button
                onClick={closeChat}
                className="p-1.5 rounded-2xl hover:bg-gray-100 transition"
              >
                <ArrowLeft size={20} />
              </button>
              <Avatar user={chatTarget} size={40} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
                  <span className="truncate">
                    {chatTarget.nickname || chatTarget.username}
                  </span>
                  <NameplateBadge obj={chatTarget} />
                </div>
                <div className="text-xs text-gray-400 truncate">
                  @{shortUid(chatTarget.id)}
                </div>
              </div>
              <button
                onClick={closeChat}
                className="p-1.5 rounded-2xl hover:bg-gray-100 transition md:hidden"
              >
                <X size={20} />
              </button>
            </div>

            {/* 非互关警告 */}
            {!chatTarget.is_mutual && (
              <div className="flex items-start gap-2 px-4 py-2.5 bg-yellow-50 border-b border-yellow-100 text-yellow-800 text-xs">
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                <span>对方还未关注你，你只能发送一条消息</span>
              </div>
            )}
            {chatDisabled && chatTarget.is_mutual === false && (
              <div className="flex items-start gap-2 px-4 py-2.5 bg-red-50 border-b border-red-100 text-red-700 text-xs">
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                <span>已达到单条消息上限，对方关注你后可继续发送</span>
              </div>
            )}

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/60">
              {loadingMsg ? (
                <div className="text-center py-8 text-gray-400">加载中...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  还没有消息，发送第一条消息吧
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_id === user?.id;
                  const isMedia = m.type === 'image' || m.type === 'video';
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
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
                    <p>上传中...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区 */}
            <form
              onSubmit={handleSend}
              className="p-3 border-t border-gray-100 flex items-center gap-2"
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
      )}
    </div>
  );
}

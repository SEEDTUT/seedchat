import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { messagesApi } from '../api';
import { useStore } from '../store';
import { formatTime } from '../lib/time';

export default function Messages() {
  const user = useStore((s) => s.user);
  const [conversations, setConversations] = useState([]);
  const [activeUserId, setActiveUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const loadConversations = async () => {
    setLoadingConv(true);
    try {
      const data = await messagesApi.conversations();
      setConversations(data || []);
    } catch (err) {
      toast.error(err.message || '加载会话失败');
    } finally {
      setLoadingConv(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const loadMessages = async (userId) => {
    setLoadingMsg(true);
    try {
      const data = await messagesApi.list(userId);
      setMessages(data || []);
    } catch (err) {
      toast.error(err.message || '加载消息失败');
    } finally {
      setLoadingMsg(false);
    }
  };

  useEffect(() => {
    if (activeUserId) {
      loadMessages(activeUserId);
    }
  }, [activeUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim() || !activeUserId) return;
    setSending(true);
    try {
      const newMsg = await messagesApi.send(activeUserId, { content: content.trim() });
      setMessages((prev) => [...prev, newMsg]);
      setContent('');
      // 更新会话列表的最后消息
      loadConversations();
    } catch (err) {
      toast.error(err.message || '发送失败');
    } finally {
      setSending(false);
    }
  };

  const activeConv = conversations.find((c) => (c.user_id || c.id) === activeUserId);
  const activeName = activeConv?.username || '';

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 hidden sm:block">私信</h1>

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden h-[calc(100vh-13rem)] min-h-[500px] flex">
        {/* 左侧会话列表 */}
        <div
          className={`${
            activeUserId ? 'hidden md:flex' : 'flex'
          } md:w-72 lg:w-80 flex-col border-r border-gray-100`}
        >
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">会话</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConv ? (
              <div className="text-center py-8 text-gray-400">加载中...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 px-4 text-gray-400">
                <MessageSquare size={40} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">还没有任何会话</p>
              </div>
            ) : (
              conversations.map((c) => {
                const cid = c.user_id || c.id;
                const isActive = cid === activeUserId;
                const unread = c.unread_count || c.unread || 0;
                return (
                  <button
                    key={cid}
                    onClick={() => setActiveUserId(cid)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                      isActive ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-2xl bg-primary-100 text-primary flex items-center justify-center font-semibold">
                        {(c.username || '?').charAt(0).toUpperCase()}
                      </div>
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {c.username}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatTime(c.last_message_at || c.updated_at || c.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        {c.last_message || '开始聊天吧'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 右侧聊天面板 */}
        <div className={`flex-1 flex flex-col ${activeUserId ? 'flex' : 'hidden md:flex'}`}>
          {activeUserId ? (
            <>
              {/* 聊天头部 */}
              <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                <button
                  onClick={() => setActiveUserId(null)}
                  className="md:hidden p-1.5 rounded-2xl hover:bg-gray-100 transition"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 rounded-2xl bg-primary-100 text-primary flex items-center justify-center font-semibold">
                  {activeName.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-gray-900">{activeName}</span>
              </div>

              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {loadingMsg ? (
                  <div className="text-center py-8 text-gray-400">加载中...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    还没有消息，发送第一条消息吧
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender_id === user?.id || m.from_id === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-3xl ${
                            isMine
                              ? 'bg-primary text-white rounded-br-md'
                              : 'bg-white text-gray-900 shadow-sm rounded-bl-md'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isMine ? 'text-primary-100' : 'text-gray-400'
                            }`}
                          >
                            {formatTime(m.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 输入区 */}
              <form
                onSubmit={handleSend}
                className="p-4 border-t border-gray-100 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="输入消息..."
                  className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={sending || !content.trim()}
                  className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary text-white hover:bg-primary-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Send size={20} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-3 text-gray-300" />
                <p>选择一个会话开始聊天</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

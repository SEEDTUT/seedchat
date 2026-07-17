import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  UserPlus,
  UserMinus,
  Users,
  Ban,
  MessageSquare,
  ShieldOff,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { friendsApi } from '../api';
import { useStore } from '../store';
import { shortUid } from '../lib/uid';
import UserAvatar from '../components/UserAvatar';
import { NameplateBadge } from '../components/Nameplate';
import SponsorName from '../components/SponsorName';
import NameplateManager from '../components/NameplateManager';

export default function Friends() {
  const user = useStore((s) => s.user);
  const navigate = useNavigate();

  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [users, setUsers] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

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

  // 跳转到私信页面
  const goToChat = (targetUser) => {
    if (targetUser.id === user?.id) {
      toast.message('不能给自己发私信');
      return;
    }
    navigate(`/messages?to=${targetUser.id}`);
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

      {/* 我的铭牌管理 */}
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
                {mutualFriends.map((f, index) => (
                  <div
                    key={f.id}
                    className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-5 animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button onClick={() => goToChat(f)} title="私信">
                        <UserAvatar user={f} size={44} showOnline />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 truncate">
                            <SponsorName isSponsor={f.is_sponsor} sponsorTier={f.sponsor_tier}>{f.nickname || f.username}</SponsorName>
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
                        onClick={() => goToChat(f)}
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
                {oneWayFriends.map((f, index) => (
                  <div
                    key={f.id}
                    className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-5 animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button onClick={() => goToChat(f)} title="私信">
                        <UserAvatar user={f} size={44} showOnline />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 truncate">
                            <SponsorName isSponsor={f.is_sponsor} sponsorTier={f.sponsor_tier}>{f.nickname || f.username}</SponsorName>
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
                        onClick={() => goToChat(f)}
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
                {blocked.map((b, index) => (
                  <div
                    key={b.id}
                    className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-5 flex items-center justify-between animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar user={b} size={44} showOnline />
                      <div className="min-w-0">
                        <span className="font-medium text-gray-900 truncate block">
                          <SponsorName isSponsor={b.is_sponsor} sponsorTier={b.sponsor_tier}>{b.nickname || b.username}</SponsorName>
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
              {filteredUsers.map((u, index) => {
                const isMe = u.id === user?.id;
                const following = !!u.is_friend;
                return (
                  <div
                    key={u.id}
                    className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-5 animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar user={u} size={44} showOnline />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 truncate">
                            <SponsorName isSponsor={u.is_sponsor} sponsorTier={u.sponsor_tier}>{u.nickname || u.username}</SponsorName>
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
                              onClick={() => goToChat(u)}
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
    </div>
  );
}

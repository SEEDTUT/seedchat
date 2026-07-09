import { useEffect, useState } from 'react';
import { Search, UserPlus, UserMinus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { friendsApi } from '../api';
import { useStore } from '../store';

export default function Friends() {
  const user = useStore((s) => s.user);
  const [friends, setFriends] = useState([]);
  const [users, setUsers] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [friendsData, usersData] = await Promise.all([
        friendsApi.list(),
        friendsApi.users(),
      ]);
      setFriends(friendsData || []);
      setUsers(usersData || []);
    } catch (err) {
      toast.error(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const filteredUsers = users.filter((u) =>
    (u.username || '').toLowerCase().includes(keyword.toLowerCase())
  );

  const isFriend = (userId) => friends.some((f) => f.id === userId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">好友</h1>

      {/* 我的好友列表 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Users size={20} className="text-primary" />
          我的好友 ({friends.length})
        </h2>
        {loading ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : friends.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm p-8 text-center text-gray-400">
            还没有好友，去关注一些用户吧
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((f) => (
              <div
                key={f.id}
                className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-primary-100 text-primary flex items-center justify-center font-semibold">
                    {(f.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900 truncate">
                    {f.username}
                  </span>
                </div>
                <button
                  onClick={() => handleRemove(f.id)}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-2xl text-sm text-gray-500 hover:bg-gray-100 transition"
                >
                  <UserMinus size={16} />
                  取关
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 所有用户列表 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">
          所有用户
        </h2>
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
              placeholder="搜索用户名..."
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
              const friend = isFriend(u.id);
              return (
                <div
                  key={u.id}
                  className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-5 flex items-center justify-between"
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
                        {isMe && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            我
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!isMe && (
                    <button
                      onClick={() => (friend ? handleRemove(u.id) : handleAdd(u.id))}
                      className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-2xl text-sm transition ${
                        friend
                          ? 'text-gray-500 hover:bg-gray-100'
                          : 'bg-primary text-white hover:bg-primary-700'
                      }`}
                    >
                      {friend ? (
                        <>
                          <UserMinus size={16} />
                          取关
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} />
                          关注
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

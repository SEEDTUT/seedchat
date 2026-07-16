import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MessageSquare,
  UserPlus,
  UserMinus,
  Calendar,
  FileText,
  Loader2,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import { usersApi, friendsApi } from '../api';
import { useStore } from '../store';
import { formatTime, formatFullTime } from '../lib/time';
import { shortUid } from '../lib/uid';
import UserAvatar from '../components/UserAvatar';
import { NameplateBadge } from '../components/Nameplate';
import SponsorName from '../components/SponsorName';

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <Loader2 size={40} className="animate-spin text-primary mb-3" />
      <p>加载中...</p>
    </div>
  );
}

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useStore((s) => s.user);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);
  const [togglingFollow, setTogglingFollow] = useState(false);

  const isMe = user?.id === Number(id) || user?.id === id;

  const loadData = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const [profileData, postsData, friendsData] = await Promise.all([
        usersApi.profile(id),
        usersApi.posts(id),
        friendsApi.list(),
      ]);
      setProfile(profileData);
      setPosts(postsData || []);
      const isFollowing = (friendsData || []).some((f) => f.id === Number(id) || f.id === id);
      setFollowing(isFollowing);
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

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const goBack = () => navigate(-1);

  const openDM = () => {
    if (!profile) return;
    if (isMe) {
      toast.message('不能给自己发私信');
      return;
    }
    navigate(`/messages?to=${profile.id}`);
  };

  const handleToggleFollow = async () => {
    if (!profile || togglingFollow) return;
    setTogglingFollow(true);
    try {
      if (following) {
        await friendsApi.remove(profile.id);
        setFollowing(false);
        toast.success('已取消关注');
      } else {
        await friendsApi.add(profile.id);
        setFollowing(true);
        toast.success('关注成功');
      }
    } catch (err) {
      toast.error(err.message || '操作失败');
    } finally {
      setTogglingFollow(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-600 hover:bg-gray-100 transition text-sm"
        >
          <ArrowLeft size={18} />
          返回
        </button>
        <LoadingSpinner />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="space-y-4">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-600 hover:bg-gray-100 transition text-sm"
        >
          <ArrowLeft size={18} />
          返回
        </button>
        <div className="bg-white rounded-3xl shadow-sm p-12 text-center">
          <UserX size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-lg">用户不存在</p>
          <p className="text-gray-400 text-sm mt-1">
            该用户可能已被删除或链接有误
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 返回按钮 */}
      <button
        onClick={goBack}
        className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-gray-600 hover:bg-gray-100 transition text-sm"
      >
        <ArrowLeft size={18} />
        返回
      </button>

      {/* 用户资料卡片 */}
      <div className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-6 animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <UserAvatar user={profile} size={128} showOnline />

          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 break-words">
                  <SponsorName isSponsor={profile.is_sponsor}>{profile.nickname || profile.username}</SponsorName>
                </h1>
                <NameplateBadge obj={profile} />
              </div>
              <p className="text-sm text-gray-400">@{shortUid(profile.id)}</p>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={16} className="text-gray-400" />
                {profile.created_at
                  ? `加入于 ${formatFullTime(profile.created_at)}`
                  : '加入时间未知'}
              </span>
              <span className="flex items-center gap-1.5">
                <FileText size={16} className="text-gray-400" />
                {profile.post_count || 0} 篇帖子
              </span>
            </div>

            {/* 操作按钮 */}
            {!isMe && (
              <div className="flex items-center gap-2 mt-5">
                <button
                  onClick={openDM}
                  className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-2xl bg-primary text-white font-medium hover:bg-primary-700 transition text-sm"
                >
                  <MessageSquare size={16} />
                  私信
                </button>
                <button
                  onClick={handleToggleFollow}
                  disabled={togglingFollow}
                  className={`flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-2xl font-medium transition text-sm disabled:opacity-60 disabled:cursor-not-allowed ${
                    following
                      ? 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                      : 'bg-primary text-white hover:bg-primary-700'
                  }`}
                >
                  {following ? (
                    <>
                      <UserMinus size={16} />
                      取消关注
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      关注
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 用户帖子列表 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileText size={20} className="text-primary" />
          TA的帖子 ({posts.length})
        </h2>

        {posts.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">该用户还没有发布任何帖子</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, index) => (
              <button
                key={post.id}
                onClick={() => navigate(`/post/${post.id}`)}
                className="w-full text-left bg-white rounded-3xl shadow-sm hover:shadow-md transition p-6 animate-fade-in-up"
                style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
              >
                <h3 className="font-semibold text-gray-900 text-lg break-words">
                  <SponsorName isSponsor={post.is_sponsor} variant="title">{post.title}</SponsorName>
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                  <span>{formatTime(post.created_at)}</span>
                  {typeof post.comment_count === 'number' && (
                    <>
                      <span>·</span>
                      <span>{post.comment_count} 条评论</span>
                    </>
                  )}
                </div>
                <p className="text-gray-600 mt-2 line-clamp-3 whitespace-pre-wrap break-words">
                  {post.content}
                </p>
                {post.image && (
                  <img
                    src={post.image}
                    alt="帖子图片"
                    className="mt-3 max-h-48 rounded-2xl object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

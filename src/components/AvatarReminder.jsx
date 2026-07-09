import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, Check } from 'lucide-react';
import { useStore } from '../store';

// 首次进入论坛时，若用户尚未设置头像，弹出提醒引导设置
// 使用 localStorage 记录是否已提醒过，避免重复打扰
export default function AvatarReminder() {
  const user = useStore((s) => s.user);
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    // 已设置头像则不提醒
    if (user.avatar) return;
    // 管理员模式不提醒
    const isAdminMode = !!sessionStorage.getItem('seedchat_admin_token');
    if (isAdminMode) return;
    // 检查是否已提醒过此用户
    const key = `seedchat_avatar_reminder_${user.id}`;
    if (localStorage.getItem(key)) return;
    // 首次进入，显示提醒
    setVisible(true);
  }, [user]);

  const dismiss = (goSettings = false) => {
    const key = `seedchat_avatar_reminder_${user?.id}`;
    localStorage.setItem(key, '1');
    setVisible(false);
    if (goSettings) {
      navigate('/settings');
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in-up">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 relative">
        {/* 关闭按钮 */}
        <button
          onClick={() => dismiss(false)}
          className="absolute top-4 right-4 p-2 rounded-2xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          title="稍后再说"
        >
          <X size={20} />
        </button>

        {/* 默认头像展示 */}
        <div className="flex justify-center mb-5">
          <img
            src="/default-avatar.png"
            alt="默认头像"
            className="w-20 h-20 rounded-3xl object-cover ring-4 ring-gray-100"
          />
        </div>

        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
          欢迎来到 seedchatx丐帮
        </h2>
        <p className="text-sm text-gray-500 text-center leading-relaxed mb-6">
          你还在使用默认头像，<br />
          设置一个专属头像让大家更容易认识你吧！
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => dismiss(true)}
            className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-2xl bg-primary text-white font-medium hover:bg-primary-700 transition"
          >
            <Camera size={18} />
            去设置头像
          </button>
          <button
            onClick={() => dismiss(false)}
            className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-2xl text-gray-500 hover:bg-gray-100 transition text-sm"
          >
            <Check size={16} />
            稍后再说
          </button>
        </div>
      </div>
    </div>
  );
}

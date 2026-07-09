import { useState, useRef } from 'react';
import { Camera, User as UserIcon, KeyRound, Check } from 'lucide-react';
import { toast } from 'sonner';
import { authApi, uploadApi } from '../api';
import { useStore } from '../store';

// 头像压缩：强制 300x300，居中裁剪为正方形
function compressAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 300, 300);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

function AvatarDisplay({ user }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt="头像"
        className="rounded-3xl object-cover"
        style={{
          maxWidth: '300px',
          maxHeight: '300px',
          width: '300px',
          height: '300px',
        }}
      />
    );
  }
  return (
    <div
      className="rounded-3xl bg-primary-100 text-primary flex items-center justify-center font-bold"
      style={{
        maxWidth: '300px',
        maxHeight: '300px',
        width: '300px',
        height: '300px',
      }}
    >
      <span className="text-6xl">
        {(user?.nickname || user?.username || '?').charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export default function Settings() {
  const user = useStore((s) => s.user);
  const updateUser = useStore((s) => s.updateUser);

  // 头像
  const avatarInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // 昵称
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [savingNickname, setSavingNickname] = useState(false);

  // 密码
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }
    setUploadingAvatar(true);
    try {
      const base64 = await compressAvatar(file);
      // 先上传到 ImgBB，拿到 URL 后再更新头像
      const uploadRes = await uploadApi.image(base64);
      const url = uploadRes.url;
      await authApi.updateAvatar({ avatar: url });
      updateUser({ avatar: url });
      toast.success('头像更新成功');
    } catch (err) {
      toast.error(err.message || '头像上传失败');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSaveNickname = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      toast.error('昵称不能为空');
      return;
    }
    setSavingNickname(true);
    try {
      await authApi.updateNickname({ nickname: nickname.trim() });
      updateUser({ nickname: nickname.trim() });
      toast.success('昵称更新成功');
    } catch (err) {
      toast.error(err.message || '昵称更新失败');
    } finally {
      setSavingNickname(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      toast.error('请填写旧密码和新密码');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('新密码至少需要 6 个字符');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    setSavingPassword(true);
    try {
      await authApi.updatePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('密码修改成功');
    } catch (err) {
      toast.error(err.message || '密码修改失败');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">设置</h1>

      {/* 头像设置 */}
      <section className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-5">
          <Camera size={20} className="text-primary" />
          头像
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <AvatarDisplay user={user} />
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-4">
              上传图片后将自动裁剪为 300x300 的正方形头像。支持 JPG / PNG 等常见格式。
            </p>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-white font-medium hover:bg-primary-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Camera size={18} />
              {uploadingAvatar ? '上传中...' : '选择图片上传'}
            </button>
          </div>
        </div>
      </section>

      {/* 昵称设置 */}
      <section className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-5">
          <UserIcon size={20} className="text-primary" />
          昵称
        </h2>
        <form onSubmit={handleSaveNickname} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              当前昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入昵称"
              className="w-full sm:max-w-md px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={savingNickname}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-white font-medium hover:bg-primary-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Check size={18} />
              {savingNickname ? '保存中...' : '保存昵称'}
            </button>
          </div>
        </form>
      </section>

      {/* 密码设置 */}
      <section className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-5">
          <KeyRound size={20} className="text-primary" />
          修改密码
        </h2>
        <form onSubmit={handleSavePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              旧密码
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="请输入旧密码"
              className="w-full sm:max-w-md px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              新密码
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="至少 6 个字符"
              className="w-full sm:max-w-md px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              确认新密码
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码"
              className="w-full sm:max-w-md px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-white font-medium hover:bg-primary-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Check size={18} />
              {savingPassword ? '修改中...' : '修改密码'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '../api';
import { useStore } from '../store';

export default function Login() {
  const navigate = useNavigate();
  const login = useStore((s) => s.login);
  const loginAdmin = useStore((s) => s.loginAdmin);

  const [mode, setMode] = useState('user'); // 'user' | 'admin'

  // 普通登录
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 管理员登录
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const handleUserLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error('请填写用户名/昵称和密码');
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.login({ username: username.trim(), password });
      login(data, data.token);
      toast.success('登录成功');
      navigate('/');
    } catch (err) {
      toast.error(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!password1 || !password2) {
      toast.error('请填写两道密码');
      return;
    }
    setAdminLoading(true);
    try {
      const data = await authApi.adminLogin(password1, password2);
      // 管理员会话仅存于 sessionStorage，不持久化
      loginAdmin(data, data.token);
      toast.success('管理员登录成功');
      navigate('/admin');
    } catch (err) {
      toast.error(err.message || '管理员登录失败');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="seedchat×丐帮"
            className="w-20 h-20 mx-auto mb-4 rounded-3xl shadow-md object-cover"
          />
          <h1 className="text-3xl font-bold text-gray-900">seedchat×丐帮</h1>
          <p className="text-gray-500 mt-2">丐帮开放式社区</p>
        </div>

        {/* 普通登录表单 */}
        {mode === 'user' && (
          <>
            <form
              onSubmit={handleUserLogin}
              className="bg-white rounded-3xl shadow-xl p-8 space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户名或昵称
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名或昵称"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-primary text-white font-medium hover:bg-primary-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </form>

            <div className="flex items-center justify-between mt-6">
              <p className="text-center text-sm text-gray-500">
                还没有账号？{' '}
                <Link
                  to="/register"
                  className="text-primary hover:underline font-medium"
                >
                  立即注册
                </Link>
              </p>
              <button
                onClick={() => setMode('admin')}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition"
              >
                <Shield size={15} />
                管理员入口
              </button>
            </div>
          </>
        )}

        {/* 管理员登录表单 */}
        {mode === 'admin' && (
          <>
            <form
              onSubmit={handleAdminLogin}
              className="bg-white rounded-3xl shadow-xl p-8 space-y-5"
            >
              <div className="flex items-center gap-2 text-primary">
                <Shield size={20} />
                <span className="font-semibold">管理员登录</span>
              </div>
              <p className="text-xs text-gray-400 -mt-2">
                请输入两道管理员密码，登录会话仅在当前标签页有效。
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密码一
                </label>
                <input
                  type="password"
                  value={password1}
                  onChange={(e) => setPassword1(e.target.value)}
                  placeholder="请输入第一道密码"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密码二
                </label>
                <input
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="请输入第二道密码"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={adminLoading}
                className="w-full py-3 rounded-2xl bg-primary text-white font-medium hover:bg-primary-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {adminLoading ? '登录中...' : '管理员登录'}
              </button>
            </form>

            <button
              onClick={() => setMode('user')}
              className="mx-auto mt-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition"
            >
              <ArrowLeft size={15} />
              返回普通登录
            </button>
          </>
        )}
      </div>
    </div>
  );
}

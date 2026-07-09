import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Friends from './pages/Friends';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import PostDetail from './pages/PostDetail';
import UserProfile from './pages/UserProfile';
import About from './pages/About';
import Updates from './pages/Updates';
import Messages from './pages/Messages';

export default function App() {
  const token = useStore((s) => s.token);
  const loadUser = useStore((s) => s.loadUser);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (token) {
        await loadUser();
      }
      setReady(true);
    };
    init();
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img
            src="/logo.png"
            alt="seedchat×丐帮"
            className="w-16 h-16 mx-auto mb-3 rounded-2xl shadow-md object-cover"
          />
          <p className="text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="friends" element={<Friends />} />
          <Route path="messages" element={<Messages />} />
          <Route path="settings" element={<Settings />} />
          <Route path="post/:id" element={<PostDetail />} />
          <Route path="user/:id" element={<UserProfile />} />
          <Route path="about" element={<About />} />
          <Route path="updates" element={<Updates />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute requireAdmin />}>
        <Route element={<Layout />}>
          <Route path="admin" element={<Admin />} />
          <Route path="admin/updates" element={<Updates />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

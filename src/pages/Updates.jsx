import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  Video as VideoIcon,
  Loader2,
  Code2,
  Check,
  Settings as SettingsIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { updatesApi, uploadApi } from '../api';
import { useStore } from '../store';
import { formatTime } from '../lib/time';

// 图片压缩：限制最大边长，居中裁剪为正方形
function compressIcon(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d');
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, maxSize, maxSize);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
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

// 价格展示
function PriceTag({ currency, amount }) {
  if (!currency || currency === 'free') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        免费
      </span>
    );
  }
  if (currency === 'emerald') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        💎 {amount ?? 0} 绿宝石
      </span>
    );
  }
  if (currency === 'diamond') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700">
        💎 {amount ?? 0} 钻石
      </span>
    );
  }
  return null;
}

function ComponentIcon({ item, size = 56 }) {
  if (item?.icon) {
    return (
      <img
        src={item.icon}
        alt={item.name}
        className="rounded-2xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-2xl bg-primary-50 text-primary flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Package size={size * 0.5} />
    </div>
  );
}

const CURRENCY_OPTIONS = [
  { value: 'free', label: '免费' },
  { value: 'emerald', label: '绿宝石' },
  { value: 'diamond', label: '钻石' },
];

const emptyForm = {
  name: '',
  description: '',
  update_content: '',
  icon: '',
  demo_video: '',
  component_code: '',
  price_currency: 'free',
  price_amount: '',
};

export default function Updates() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const isAdminMode = useStore((s) => s.is_admin_mode);

  // 管理视图：路由以 /admin/updates 开头，且具备管理员权限
  const isAdminView =
    location.pathname.startsWith('/admin/updates') &&
    (user?.is_admin || isAdminMode);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // 表单状态
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const iconInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await updatesApi.list();
      setItems(data || []);
    } catch (err) {
      toast.error(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setForm({
      name: item.name || '',
      description: item.description || '',
      update_content: item.update_content || '',
      icon: item.icon || '',
      demo_video: item.demo_video || '',
      component_code: item.component_code || '',
      price_currency: item.price_currency || 'free',
      price_amount:
        item.price_amount !== undefined && item.price_amount !== null
          ? String(item.price_amount)
          : '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleIconChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }
    setUploadingIcon(true);
    try {
      const base64 = await compressIcon(file, 200);
      const uploadRes = await uploadApi.image(base64);
      setField('icon', uploadRes.url);
      toast.success('图标已上传');
    } catch (err) {
      toast.error(err.message || '图标上传失败');
    } finally {
      setUploadingIcon(false);
      if (iconInputRef.current) iconInputRef.current.value = '';
    }
  };

  const handleVideoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error('请选择视频文件');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('视频不能超过 5MB');
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }
    setUploadingVideo(true);
    try {
      const base64 = await fileToBase64(file);
      setField('demo_video', base64);
      toast.success('视频已加载');
    } catch (err) {
      toast.error(err.message || '视频加载失败');
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('请填写组件名称');
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      update_content: form.update_content.trim() || null,
      icon: form.icon || null,
      demo_video: form.demo_video || null,
      component_code: form.component_code.trim() || null,
      price_currency: form.price_currency || 'free',
      price_amount:
        form.price_currency === 'free'
          ? 0
          : Number(form.price_amount) || 0,
    };
    setSubmitting(true);
    try {
      if (editingId) {
        const updated = await updatesApi.update(editingId, payload);
        setItems((prev) => prev.map((it) => (it.id === editingId ? updated : it)));
        toast.success('已更新');
      } else {
        const created = await updatesApi.create(payload);
        setItems((prev) => [created, ...prev]);
        toast.success('已添加组件');
      }
      resetForm();
    } catch (err) {
      toast.error(err.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`确定要删除组件「${item.name}」吗？`)) return;
    try {
      await updatesApi.remove(item.id);
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      toast.success('已删除');
    } catch (err) {
      toast.error(err.message || '删除失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题区 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package size={24} className="text-primary" />
            组件更新
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Minecraft 组件资源与更新日志
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 管理员在公开页可跳转到管理视图 */}
          {!isAdminView && (user?.is_admin || isAdminMode) && (
            <button
              onClick={() => navigate('/admin/updates')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary text-white text-sm font-medium hover:bg-primary-700 transition"
            >
              <SettingsIcon size={16} />
              管理组件
            </button>
          )}
          {isAdminView && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary text-white text-sm font-medium hover:bg-primary-700 transition"
            >
              <Plus size={16} />
              添加组件
            </button>
          )}
        </div>
      </div>

      {/* 管理表单 */}
      {isAdminView && showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-sm p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Pencil size={18} className="text-primary" />
              {editingId ? '编辑组件' : '添加组件'}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="p-2 rounded-2xl text-gray-400 hover:bg-gray-100 transition"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                组件名称
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="请输入组件名称"
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                组件代码（可选）
              </label>
              <input
                type="text"
                value={form.component_code}
                onChange={(e) => setField('component_code', e.target.value)}
                placeholder="如 plugin:example"
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              描述
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="组件描述..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              更新内容（可选）
            </label>
            <textarea
              value={form.update_content}
              onChange={(e) => setField('update_content', e.target.value)}
              placeholder="本次更新内容..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition resize-none"
            />
          </div>

          {/* 图标上传 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              图标（可选，自动压缩为 200x200）
            </label>
            <input
              ref={iconInputRef}
              type="file"
              accept="image/*"
              onChange={handleIconChange}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              {form.icon ? (
                <div className="relative">
                  <img
                    src={form.icon}
                    alt="图标"
                    className="w-14 h-14 rounded-2xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setField('icon', '')}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => iconInputRef.current?.click()}
                  disabled={uploadingIcon}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-dashed border-gray-300 text-gray-500 hover:border-primary hover:text-primary transition text-sm disabled:opacity-60"
                >
                  <Upload size={16} />
                  {uploadingIcon ? '上传中...' : '上传图标'}
                </button>
              )}
            </div>
          </div>

          {/* 演示视频上传 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              演示视频（可选，最大 5MB）
            </label>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className="hidden"
            />
            <div className="flex items-center gap-3">
              {form.demo_video ? (
                <div className="relative">
                  <video
                    src={form.demo_video}
                    className="w-24 h-24 rounded-2xl object-cover"
                    controls
                  />
                  <button
                    type="button"
                    onClick={() => setField('demo_video', '')}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploadingVideo}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-dashed border-gray-300 text-gray-500 hover:border-primary hover:text-primary transition text-sm disabled:opacity-60"
                >
                  <VideoIcon size={16} />
                  {uploadingVideo ? '加载中...' : '上传视频'}
                </button>
              )}
            </div>
          </div>

          {/* 价格 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                价格货币
              </label>
              <select
                value={form.price_currency}
                onChange={(e) => setField('price_currency', e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition bg-white"
              >
                {CURRENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {form.price_currency !== 'free' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  价格数量
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.price_amount}
                  onChange={(e) => setField('price_amount', e.target.value)}
                  placeholder="数量"
                  className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-100 outline-none transition"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2.5 rounded-2xl text-gray-600 hover:bg-gray-100 transition text-sm"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-white font-medium hover:bg-primary-700 transition disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              <Check size={16} />
              {submitting ? '保存中...' : editingId ? '保存修改' : '添加'}
            </button>
          </div>
        </form>
      )}

      {/* 组件列表 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Loader2 size={36} className="animate-spin text-primary mb-3" />
          <p>加载中...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm p-12 text-center">
          <Package size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">还没有组件，敬请期待。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-5 flex flex-col"
            >
              <div className="flex items-center gap-3">
                <ComponentIcon item={item} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {item.name}
                  </h3>
                  <div className="mt-1">
                    <PriceTag
                      currency={item.price_currency}
                      amount={item.price_amount}
                    />
                  </div>
                </div>
              </div>

              {item.description && (
                <p className="text-gray-600 text-sm mt-3 line-clamp-3 whitespace-pre-wrap break-words">
                  {item.description}
                </p>
              )}

              {item.update_content && (
                <div className="mt-3 bg-primary-50/60 rounded-2xl p-3">
                  <p className="text-xs font-medium text-primary mb-1">
                    更新内容
                  </p>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap break-words line-clamp-4">
                    {item.update_content}
                  </p>
                </div>
              )}

              {item.demo_video && (
                <video
                  src={item.demo_video}
                  controls
                  className="mt-3 w-full rounded-2xl max-h-48 object-cover"
                />
              )}

              {item.component_code && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-1.5">
                  <Code2 size={13} />
                  <code className="truncate">{item.component_code}</code>
                </div>
              )}

              {item.created_at && (
                <p className="text-xs text-gray-400 mt-3">
                  {formatTime(item.created_at)}
                </p>
              )}

              {isAdminView && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => openEdit(item)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-2xl text-sm text-primary hover:bg-primary-50 transition"
                  >
                    <Pencil size={14} />
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-2xl text-sm text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                  >
                    <Trash2 size={14} />
                    删除
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

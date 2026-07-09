import { useEffect, useState } from 'react';
import { Loader2, Check, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { nameplatesApi } from '../api';
import Nameplate from './Nameplate';

// 当前用户铭牌管理：查看拥有的铭牌并选择佩戴/取下
export default function NameplateManager() {
  const [plates, setPlates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // 正在操作的 id 或 'off'

  const load = async () => {
    setLoading(true);
    try {
      const data = await nameplatesApi.my();
      setPlates(data || []);
    } catch {
      // 接口可能尚未开放，静默处理
      setPlates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleActivate = async (id) => {
    setBusy(id);
    try {
      await nameplatesApi.activate(id);
      setPlates((prev) =>
        prev.map((p) => ({ ...p, is_active: p.id === id ? 1 : 0 }))
      );
      toast.success('已佩戴铭牌');
    } catch (err) {
      toast.error(err.message || '操作失败');
    } finally {
      setBusy(null);
    }
  };

  const handleDeactivate = async () => {
    setBusy('off');
    try {
      await nameplatesApi.deactivate();
      setPlates((prev) => prev.map((p) => ({ ...p, is_active: 0 })));
      toast.success('已取下铭牌');
    } catch (err) {
      toast.error(err.message || '操作失败');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Loader2 size={16} className="animate-spin" />
        加载铭牌...
      </div>
    );
  }

  if (plates.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        你还没有铭牌，管理员发放后可在此选择佩戴。
      </p>
    );
  }

  const hasActive = plates.some((p) => p.is_active);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {plates.map((p) => {
        const active = !!p.is_active;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => (active ? handleDeactivate() : handleActivate(p.id))}
            disabled={busy !== null}
            className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border transition disabled:opacity-60 ${
              active
                ? 'border-primary ring-2 ring-primary-100 bg-primary-50/50'
                : 'border-gray-200 hover:border-primary'
            }`}
          >
            <Tag size={13} className="text-gray-400" />
            <Nameplate
              text={p.text}
              bgColor={p.bg_color}
              textColor={p.text_color}
            />
            {active && <Check size={14} className="text-primary" />}
          </button>
        );
      })}
      <button
        type="button"
        onClick={handleDeactivate}
        disabled={busy !== null || !hasActive}
        className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 disabled:opacity-40"
      >
        取下铭牌
      </button>
    </div>
  );
}

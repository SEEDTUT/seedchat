// 铭牌徽章组件：在昵称后展示带颜色的文字铭牌
export default function Nameplate({ text, bgColor, textColor }) {
  if (!text) return null;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium align-middle whitespace-nowrap"
      style={{
        backgroundColor: bgColor || '#2563eb',
        color: textColor || '#ffffff',
      }}
    >
      {text}
    </span>
  );
}

// 从任意对象（user / post / comment / friend）中提取铭牌信息
// 兼容嵌套 active_nameplate 对象与扁平字段两种返回结构
export function extractNameplate(obj) {
  if (!obj) return null;
  if (obj.active_nameplate && obj.active_nameplate.text) {
    const np = obj.active_nameplate;
    return {
      text: np.text,
      bgColor: np.bg_color || np.bgColor,
      textColor: np.text_color || np.textColor,
    };
  }
  if (obj.nameplate_text) {
    return {
      text: obj.nameplate_text,
      bgColor: obj.nameplate_bg_color || obj.nameplate_bgColor,
      textColor: obj.nameplate_text_color || obj.nameplate_textColor,
    };
  }
  return null;
}

// 便捷组件：传入任意对象即可渲染其铭牌（无铭牌则返回 null）
export function NameplateBadge({ obj }) {
  const np = extractNameplate(obj);
  if (!np) return null;
  return <Nameplate {...np} />;
}

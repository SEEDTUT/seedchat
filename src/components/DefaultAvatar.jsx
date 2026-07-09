// 默认头像组件
// 使用统一的灰色剪影占位图，所有未设置头像的用户共用同一张图
export default function DefaultAvatar({ size = 40, className = '' }) {
  return (
    <img
      src="/default-avatar.png"
      alt="默认头像"
      className={`rounded-2xl object-cover ${className}`}
      style={{ width: size, height: size, display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    />
  );
}

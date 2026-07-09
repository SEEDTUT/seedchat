import DefaultAvatar from './DefaultAvatar';

// 通用用户头像组件
// - 展示用户头像图片（object-cover，圆角）或几何默认头像
// - 当 showOnline 为 true 时，在右下角显示在线状态小圆点
//   在线（is_online === true）显示绿色，离线显示灰色
// Props: { user, size, showOnline }
export default function UserAvatar({ user, size = 40, showOnline = false }) {
  const online = user?.is_online;
  const dotSize = Math.max(8, size * 0.25);
  return (
    <div
      className="relative inline-block flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt=""
          className="rounded-2xl object-cover w-full h-full"
        />
      ) : (
        <DefaultAvatar seed={user?.id} size={size} />
      )}
      {showOnline && (
        <span
          className="absolute bottom-0 right-0 rounded-full ring-2 ring-white"
          style={{
            width: dotSize,
            height: dotSize,
            backgroundColor: online ? '#22c55e' : '#d1d5db',
          }}
        />
      )}
    </div>
  );
}

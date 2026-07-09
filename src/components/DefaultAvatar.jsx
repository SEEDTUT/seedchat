// 基于种子（用户 UID / id）生成确定性的几何 SVG 头像
// 以蓝色为主色调，包含圆形 / 五边形 / 六边形等几何变体，保证同种子同结果
function hashSeed(seed) {
  let h = 0;
  const s = String(seed ?? '');
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function DefaultAvatar({ seed, size = 40, className = '' }) {
  const h = hashSeed(seed);
  // 蓝色色相范围 (200-244)，保证整体蓝色主题
  const baseHue = 200 + (h % 45);
  const accentHue = 185 + ((h >> 4) % 75);
  const bg = `hsl(${baseHue}, 68%, 54%)`;
  const bgDeep = `hsl(${baseHue}, 60%, 44%)`;
  const c1 = `hsl(${accentHue}, 80%, 74%)`;
  const c2 = `hsl(${accentHue}, 74%, 86%)`;
  const c3 = `hsl(${(accentHue + 35) % 360}, 72%, 66%)`;

  const variant = h % 3;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      <rect width="100" height="100" rx="24" fill={bg} />
      {/* 底部加深，增加层次 */}
      <path
        d="M0,68 Q50,54 100,70 L100,100 L0,100 Z"
        fill={bgDeep}
        opacity="0.35"
      />
      {variant === 0 && (
        <g>
          <circle cx="50" cy="36" r="20" fill={c1} opacity="0.9" />
          <circle cx="30" cy="68" r="14" fill={c2} opacity="0.85" />
          <circle cx="70" cy="68" r="14" fill={c2} opacity="0.85" />
        </g>
      )}
      {variant === 1 && (
        <g>
          <polygon points="50,22 72,40 64,66 36,66 28,40" fill={c1} opacity="0.9" />
          <circle cx="50" cy="48" r="10" fill={c2} opacity="0.95" />
        </g>
      )}
      {variant === 2 && (
        <g>
          <polygon points="50,24 70,36 70,62 50,74 30,62 30,36" fill={c1} opacity="0.9" />
          <circle cx="34" cy="44" r="7" fill={c2} opacity="0.85" />
          <circle cx="66" cy="44" r="7" fill={c2} opacity="0.85" />
          <circle cx="50" cy="60" r="7" fill={c3} opacity="0.85" />
        </g>
      )}
    </svg>
  );
}

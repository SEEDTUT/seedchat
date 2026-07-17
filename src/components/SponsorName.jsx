import { useMemo } from 'react';

/**
 * SponsorName - 赞助会员昵称组件
 *
 * sponsorTier:
 *   0 = 普通用户（无效果）
 *   1 = VIP（金色金属光泽流动效果）
 *   2 = SVIP（金紫混色流动 + 粒子飘散特效）
 *
 * 兼容旧调用方式：若只传 isSponsor，则 isSponsor=true 时视为 tier=1
 *
 * 用法:
 * <SponsorName sponsorTier={user.sponsor_tier} className="text-lg">{user.nickname}</SponsorName>
 * <SponsorName isSponsor={post.is_sponsor} sponsorTier={post.sponsor_tier} variant="title">{post.title}</SponsorName>
 */
function SvipParticles() {
  // 生成 6 个粒子，使用预定义的不同动画延迟和位置
  const particles = useMemo(
    () => [
      { left: '-8%', delay: '0s', duration: '3s', size: 4 },
      { left: '5%', delay: '0.5s', duration: '2.8s', size: 3 },
      { left: '20%', delay: '1s', duration: '3.5s', size: 5 },
      { left: '50%', delay: '0.3s', duration: '3.2s', size: 3 },
      { left: '75%', delay: '0.8s', duration: '2.6s', size: 4 },
      { left: '92%', delay: '1.2s', duration: '3.8s', size: 3 },
      { left: '105%', delay: '0.6s', duration: '3.1s', size: 4 },
    ],
    []
  );

  return (
    <span className="svip-particles" aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          className="svip-particle"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: `${p.size}px`,
            height: `${p.size}px`,
          }}
        />
      ))}
    </span>
  );
}

export default function SponsorName({
  isSponsor,
  sponsorTier,
  variant = 'name',
  className = '',
  children,
  ...props
}) {
  // 统一计算 tier：优先使用 sponsorTier，否则回退到 isSponsor
  const tier = sponsorTier != null ? sponsorTier : isSponsor ? 1 : 0;

  if (tier === 2) {
    // SVIP：金紫混色 + 粒子特效
    const svipClass = variant === 'title' ? 'svip-title' : 'svip-name';
    return (
      <span className={`svip-wrapper ${className}`} {...props}>
        <span className={svipClass}>{children}</span>
        <SvipParticles />
      </span>
    );
  }

  if (tier === 1 || isSponsor) {
    // VIP：金色金属光泽
    const sponsorClass = variant === 'title' ? 'sponsor-title' : 'sponsor-name';
    return (
      <span className={`${sponsorClass} ${className}`} {...props}>
        {children}
      </span>
    );
  }

  return (
    <span className={className} {...props}>
      {children}
    </span>
  );
}

/**
 * SponsorName - 赞助会员昵称组件
 * 当 is_sponsor 为 true 时，显示带动态金属光泽流动效果的金色文字
 * 否则显示普通文字
 *
 * 用法:
 * <SponsorName isSponsor={user.is_sponsor} className="text-lg">{user.nickname}</SponsorName>
 * <SponsorName isSponsor={post.is_sponsor} variant="title">{post.title}</SponsorName>
 */
export default function SponsorName({ isSponsor, variant = 'name', className = '', children, ...props }) {
  if (isSponsor) {
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

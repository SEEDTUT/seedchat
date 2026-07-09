import { MessageCircle, Sparkles, Users, Shield, Sprout } from 'lucide-react';

export default function About() {
  const features = [
    {
      icon: MessageCircle,
      title: '开放社区',
      desc: '自由发帖、评论、私信，与丐帮伙伴畅所欲言。',
    },
    {
      icon: Users,
      title: '好友互动',
      desc: '关注、互关、私信，结识更多志同道合的人。',
    },
    {
      icon: Sparkles,
      title: '铭牌系统',
      desc: '独特的身份铭牌，展示你的个性与成就。',
    },
    {
      icon: Shield,
      title: '管理员守护',
      desc: '独立的管理员通道，维护社区秩序与内容。',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 顶部品牌区 */}
      <div className="bg-white rounded-3xl shadow-sm p-8 md:p-12 text-center">
        <img
          src="/logo.png"
          alt="seedchat×丐帮"
          className="w-24 h-24 mx-auto mb-5 rounded-3xl shadow-md object-cover"
        />
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          seedchat×丐帮
        </h1>
        <p className="text-gray-500 mt-4 text-lg max-w-2xl mx-auto leading-relaxed">
          seedchat×丐帮是seedchat全新升级版，是现丐帮开放式社区，但不止于此
        </p>
      </div>

      {/* 描述卡片 */}
      <div className="bg-gradient-to-br from-primary-50 to-primary-100/60 rounded-3xl shadow-sm p-8">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 bg-primary text-white rounded-2xl p-3">
            <Sprout size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              关于我们
            </h2>
            <p className="text-gray-700 leading-relaxed">
              seedchat×丐帮是seedchat全新升级版，是现丐帮开放式社区，但不止于此。
              我们致力于打造一个开放、自由、有趣的交流空间，让每一位丐帮伙伴都能在这里找到归属。
            </p>
          </div>
        </div>
      </div>

      {/* 功能特性 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">功能特性</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-3xl shadow-sm hover:shadow-md transition p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-primary-50 text-primary rounded-2xl p-2.5">
                  <f.icon size={20} />
                </div>
                <h3 className="font-semibold text-gray-900">{f.title}</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

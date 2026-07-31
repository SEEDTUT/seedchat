# SEEDCHAT 🌱

> 丐帮|beggarhub 我的世界工作室官方论坛

一个基于 Cloudflare Workers 构建的全功能论坛与即时通讯平台。

## ✨ 功能特性

- **公开帖子系统** - 发帖、编辑、删除、点赞、评论、置顶、分享
- **私信系统** - 一对一实时聊天、图片消息、消息撤回
- **群聊系统** - 创建群聊、群消息、群成员管理、消息撤回
- **好友系统** - 搜索用户、发送/接受/拒绝好友请求、好友列表
- **黑名单系统** - 拉黑用户、自动解除好友关系、黑名单管理
- **图片储存** - 基于 imgbb 图床，客户端自动压缩后上传
- **撤回系统** - 2分钟内可撤回私信和群消息
- **用户设置** - 修改昵称、头像、签名、密码、注销账号、退出登录
- **通知系统** - 好友请求、点赞、评论、群邀请等通知
- **内容实时刷新** - 新帖子实时推送、消息实时接收、在线状态实时更新

## 🛠 技术栈

| 组件 | 技术 |
|------|------|
| 后端 | Cloudflare Workers (ES Modules) |
| 数据库 | Cloudflare D1 (SQLite) |
| 实时通讯 | Cloudflare Durable Objects + WebSocket Hibernation |
| 图片储存 | imgbb API（客户端压缩后上传） |
| 前端 | 原生 HTML/CSS/JS（SPA） |
| 设计风格 | 简约现代、大圆角、卡片式布局 |

## 📁 项目结构

```
├── src/
│   ├── index.js          # 主 Worker 入口，API 路由
│   ├── realtime.js       # Durable Object 实时通讯
│   └── utils.js          # 工具函数（认证、图片上传等）
├── public/
│   ├── index.html        # SPA 入口
│   ├── css/style.css     # 样式（简约现代设计）
│   └── js/app.js         # 前端应用逻辑
├── migrations/
│   └── 0001_init.sql     # 数据库初始化 SQL
├── wrangler.toml         # Cloudflare Workers 配置
└── package.json
```

## 🚀 部署

```bash
# 安装依赖
npm install

# 创建 D1 数据库
npx wrangler d1 create seedchat-db

# 更新 wrangler.toml 中的 database_id

# 执行数据库迁移
npx wrangler d1 execute seedchat-db --remote --file=migrations/0001_init.sql

# 部署
npx wrangler deploy
```

## 🌐 访问

部署后访问 Worker URL 即可使用。

---

© 丐帮|beggarhub 我的世界工作室

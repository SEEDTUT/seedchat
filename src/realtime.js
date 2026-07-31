// ========== 实时通讯 Durable Object ==========
// 使用 WebSocket Hibernation API 管理所有实时连接

export class RealtimeHub {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  // 处理 HTTP 请求
  async fetch(request) {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get('Upgrade');

    // 内部 API：从 Worker 推送消息给已连接用户
    if (upgradeHeader !== 'websocket') {
      if (request.method === 'POST') {
        try {
          const body = await request.json();
          if (body.type === 'send_to_user' && body.userId && body.data) {
            this.sendToUser(body.userId, body.data);
          } else if (body.type === 'send_to_group' && body.groupId && body.data) {
            await this.sendToGroup(body.groupId, body.data, null);
          } else if (body.type === 'broadcast' && body.data) {
            this.broadcastAll(body.data);
          }
          return new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
          return new Response('{"error":"bad request"}', { status: 400 });
        }
      }
      return new Response('Method not allowed', { status: 405 });
    }

    // WebSocket 升级
    const token = url.searchParams.get('token');
    if (!token) {
      return new Response('Missing token', { status: 401 });
    }

    // 验证 token
    const session = await this.env.DB.prepare(
      'SELECT u.id, u.username, u.nickname, u.avatar FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?'
    ).bind(token, Math.floor(Date.now() / 1000)).first();

    if (!session) {
      return new Response('Invalid token', { status: 401 });
    }

    // 创建 WebSocket 对
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // 存储用户信息到 WebSocket attachment
    server.serializeAttachment({
      userId: session.id,
      username: session.username,
      nickname: session.nickname,
      avatar: session.avatar,
    });

    // 接受连接（使用 hibernation）
    this.state.acceptWebSocket(server);

    // 更新在线状态
    await this.env.DB.prepare(
      'UPDATE users SET status = ?, last_active = ? WHERE id = ?'
    ).bind('online', Math.floor(Date.now() / 1000), session.id).run();

    // 通知该用户的所有好友其上线
    await this.broadcastUserStatus(session.id, 'online');

    return new Response(null, { status: 101, webSocket: client });
  }

  // 处理收到的 WebSocket 消息
  async webSocketMessage(ws, message) {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    const attachment = ws.deserializeAttachment();
    if (!attachment) return;
    const { userId } = attachment;

    switch (data.type) {
      case 'private_message':
        await this.handlePrivateMessage(userId, data);
        break;
      case 'group_message':
        await this.handleGroupMessage(userId, data);
        break;
      case 'recall_message':
        await this.handleRecallMessage(userId, data);
        break;
      case 'recall_group_message':
        await this.handleRecallGroupMessage(userId, data);
        break;
      case 'new_post':
        await this.broadcastNewPost(userId, data);
        break;
      case 'typing':
        await this.handleTyping(userId, data);
        break;
      case 'read_messages':
        await this.handleReadMessages(userId, data);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  }

  // 处理 WebSocket 关闭
  async webSocketClose(ws, code, reason) {
    const attachment = ws.deserializeAttachment();
    if (!attachment) return;
    const { userId } = attachment;

    // 检查该用户是否还有其他连接
    const userConnections = this.state.getWebSockets().filter(socket => {
      const att = socket.deserializeAttachment();
      return att && att.userId === userId;
    });

    // 如果这是该用户的最后一个连接，标记为离线
    if (userConnections.length <= 1) {
      await this.env.DB.prepare(
        'UPDATE users SET status = ?, last_active = ? WHERE id = ?'
      ).bind('offline', Math.floor(Date.now() / 1000), userId).run();
      await this.broadcastUserStatus(userId, 'offline');
    }
  }

  async webSocketError(ws, error) {
    console.error('WebSocket error:', error);
  }

  // 发送私信
  async handlePrivateMessage(fromId, data) {
    const { toId, content, msgId, msgType } = data;
    // 发送给接收者
    this.sendToUser(toId, {
      type: 'private_message',
      fromId,
      content,
      msgId,
      msgType: msgType || 'text',
      timestamp: Date.now(),
    });
    // 发回确认给发送者
    this.sendToUser(fromId, {
      type: 'message_sent',
      toId,
      msgId,
      timestamp: Date.now(),
    });
  }

  // 发送群聊消息
  async handleGroupMessage(fromId, data) {
    const { groupId, content, msgId, msgType } = data;
    // 获取群成员
    const members = await this.env.DB.prepare(
      'SELECT user_id FROM group_members WHERE group_id = ?'
    ).bind(groupId).all();

    const memberIds = members.results.map(m => m.user_id);
    for (const memberId of memberIds) {
      if (memberId !== fromId || true) {
        this.sendToUser(memberId, {
          type: 'group_message',
          groupId,
          fromId,
          content,
          msgId,
          msgType: msgType || 'text',
          timestamp: Date.now(),
        });
      }
    }
  }

  // 撤回私信
  async handleRecallMessage(userId, data) {
    const { msgId, toId } = data;
    this.sendToUser(toId, {
      type: 'recall_message',
      msgId,
      fromId: userId,
      timestamp: Date.now(),
    });
  }

  // 撤回群消息
  async handleRecallGroupMessage(userId, data) {
    const { msgId, groupId } = data;
    const members = await this.env.DB.prepare(
      'SELECT user_id FROM group_members WHERE group_id = ?'
    ).bind(groupId).all();
    for (const member of members.results) {
      this.sendToUser(member.user_id, {
        type: 'recall_group_message',
        msgId,
        groupId,
        timestamp: Date.now(),
      });
    }
  }

  // 广播新帖子（实时刷新）
  async broadcastNewPost(userId, data) {
    this.broadcastAll({
      type: 'new_post',
      postId: data.postId,
      title: data.title,
      authorId: userId,
      timestamp: Date.now(),
    });
  }

  // 打字状态
  async handleTyping(userId, data) {
    const { toId, isGroup, groupId } = data;
    if (isGroup && groupId) {
      const members = await this.env.DB.prepare(
        'SELECT user_id FROM group_members WHERE group_id = ?'
      ).bind(groupId).all();
      for (const member of members.results) {
        if (member.user_id !== userId) {
          this.sendToUser(member.user_id, {
            type: 'typing',
            fromId: userId,
            groupId,
            timestamp: Date.now(),
          });
        }
      }
    } else if (toId) {
      this.sendToUser(toId, {
        type: 'typing',
        fromId: userId,
        timestamp: Date.now(),
      });
    }
  }

  // 已读消息
  async handleReadMessages(userId, data) {
    // 通知对方消息已读
    if (data.fromId) {
      this.sendToUser(data.fromId, {
        type: 'messages_read',
        byUserId: userId,
        timestamp: Date.now(),
      });
    }
  }

  // 广播用户状态变更
  async broadcastUserStatus(userId, status) {
    // 获取好友列表
    const friends = await this.env.DB.prepare(
      `SELECT friend_id FROM friendships WHERE user_id = ? AND status = 'accepted'
       UNION
       SELECT user_id FROM friendships WHERE friend_id = ? AND status = 'accepted'`
    ).bind(userId, userId).all();

    for (const friend of friends.results) {
      this.sendToUser(friend.friend_id || friend.user_id, {
        type: 'user_status',
        userId,
        status,
        timestamp: Date.now(),
      });
    }
  }

  // 发送消息给指定用户的所有连接
  sendToUser(userId, data) {
    const sockets = this.state.getWebSockets();
    for (const ws of sockets) {
      const att = ws.deserializeAttachment();
      if (att && att.userId === userId) {
        try {
          ws.send(JSON.stringify(data));
        } catch (e) {
          // 连接可能已关闭
        }
      }
    }
  }

  // 发送给群组所有成员（从内部 API 调用）
  async sendToGroup(groupId, data, excludeUserId) {
    const members = await this.env.DB.prepare(
      'SELECT user_id FROM group_members WHERE group_id = ?'
    ).bind(groupId).all();
    for (const member of members.results) {
      if (excludeUserId && member.user_id === excludeUserId) continue;
      this.sendToUser(member.user_id, data);
    }
  }

  // 广播给所有连接
  broadcastAll(data) {
    const sockets = this.state.getWebSockets();
    for (const ws of sockets) {
      try {
        ws.send(JSON.stringify(data));
      } catch (e) {
        // 连接可能已关闭
      }
    }
  }
}

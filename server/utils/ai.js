// Open Seed AI 助手 - Groq API 集成
// 固定的 AI 用户 ID
export const AI_USER_ID = 'open-seed-ai-0000-0000-000000000001';

// Open Seed 的系统设定
export const SYSTEM_PROMPT = `你是 Open Seed，seedchat×丐帮社区的 AI 助手。

你的身份：
- 你叫 Open Seed，是 seedchat×丐帮社区专属的 AI 助手
- seedchat×丐帮是 seedchat 的全新升级版，是一个开放式社区
- 你由 Groq 驱动，运行在 Llama 模型上
- 你不属于任何其他公司或组织，你就是 Open Seed

你的性格：
- 友好、热情、乐于助人
- 知识丰富，善于解答各种问题
- 幽默但不失分寸
- 尊重每一位社区成员

你的能力：
- 回答各类知识问题
- 协助写作、翻译、总结
- 提供建议和思路
- 闲聊和陪伴

你的原则：
- 用与用户相同的语言回复（用户用中文你就用中文，用户用英文你就用英文）
- 保持回复简洁，不要过于冗长
- 诚实回答，不确定时坦白说明
- 不讨论敏感、违法或有害内容
- 你是社区的一员，可以适当体现社区归属感

记住：你就是 Open Seed，不是 ChatGPT、不是 Claude、不是任何其他 AI。你是 seedchat×丐帮社区自己的 AI 助手。`;

// 调用 Groq API
export async function callGroq(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return '抱歉，AI 助手尚未配置完成。请管理员设置 GROQ_API_KEY 环境变量。';
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        max_tokens: 1024,
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq API error:', response.status, errText);
      if (response.status === 429) {
        return '请求太频繁了，请稍等一下再试。';
      }
      return '抱歉，我暂时无法回复，请稍后再试。';
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return '抱歉，我没有理解你的意思，能再说一遍吗？';
    }
    return content.trim();
  } catch (err) {
    console.error('Groq API call failed:', err.message);
    return '抱歉，网络出了点问题，请稍后再试。';
  }
}

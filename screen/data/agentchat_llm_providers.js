export const LLM_PROVIDERS = {
  gpt: {
    kind: 'openai_compat',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-5.4-mini',
    authHeader: apiKey => ({ Authorization: `Bearer ${apiKey}` }),
  },
  grok: {
    kind: 'openai_compat',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-4',
    authHeader: apiKey => ({ Authorization: `Bearer ${apiKey}` }),
  },
  claude: {
    kind: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-5',
    authHeader: apiKey => ({ 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }),
  },
  deepseek: {
    kind: 'openai_compat',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    authHeader: apiKey => ({ Authorization: `Bearer ${apiKey}` }),
  },
  kimi: {
    kind: 'openai_compat',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'kimi-k2-turbo-preview',
    authHeader: apiKey => ({ Authorization: `Bearer ${apiKey}` }),
  },
  qwen: {
    kind: 'openai_compat',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    authHeader: apiKey => ({ Authorization: `Bearer ${apiKey}` }),
  },
  openrouter: {
    kind: 'openai_compat',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/auto',
    authHeader: apiKey => ({ Authorization: `Bearer ${apiKey}` }),
  },
  xkeva: {
    kind: 'openai_compat',
    baseUrl: 'https://x.xkeva.com/model.php/v1',
    defaultModel: 'xkeva',
    fixedModel: true,
    skipModelFetch: true,
    noKeyRequired: true,
    authHeader: apiKey => (apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  },
  gemini: {
    kind: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.5-flash',
    authHeader: apiKey => ({ 'x-goog-api-key': apiKey }),
  },
};

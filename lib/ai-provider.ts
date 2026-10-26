export type AIProvider = 'openai' | 'codex';
export type AISettings = {
  OPENAI_API_KEY?: string;
  CODEX_BRIDGE_URL?: string;
  CODEX_BRIDGE_TOKEN?: string;
  HOST_CODEX_ENABLED?: string;
};

export function availableAIProviders(settings: AISettings, local: boolean): AIProvider[] {
  const hostedCodex = settings.HOST_CODEX_ENABLED === 'true';
  // Hosting uses the operator's ChatGPT allowance and must never fall back to
  // API billing, even when an API key exists in the local development settings.
  const providers: AIProvider[] = !hostedCodex && settings.OPENAI_API_KEY ? ['openai'] : [];
  if ((local || hostedCodex) && settings.CODEX_BRIDGE_TOKEN && settings.CODEX_BRIDGE_URL) {
    try {
      const url = new URL(settings.CODEX_BRIDGE_URL);
      if (url.protocol === 'http:' && url.hostname === '127.0.0.1' && !url.username && !url.password) providers.push('codex');
    } catch { /* An invalid bridge address never enables local inference. */ }
  }
  return providers;
}

export function selectAIProvider(settings: AISettings, local: boolean, requested?: unknown): AIProvider {
  const providers = availableAIProviders(settings, local);
  if (requested !== undefined && requested !== 'openai' && requested !== 'codex') throw new Error('Lựa chọn AI chưa hợp lệ.');
  const selected = requested ?? providers[0];
  if (!providers.includes(selected as AIProvider)) {
    if (selected === 'codex') throw new Error('Codex chưa được bật. Chạy npm run dev:codex trên localhost hoặc npm run host và đăng nhập Codex bằng ChatGPT.');
    throw new Error('AI chưa được kết nối. Bạn vẫn có thể viết, lưu, nộp bài và nhận đánh giá từ giảng viên.');
  }
  return selected as AIProvider;
}

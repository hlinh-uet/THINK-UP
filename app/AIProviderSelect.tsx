'use client';

import { useState } from 'react';
import type { Data } from '../lib/domain';
import type { AIProvider } from '../lib/ai-provider';

export function useAIProvider(data: Data) {
  const providers = data.aiProviders ?? (data.aiReady ? ['openai'] : []);
  const [selection, setSelection] = useState<AIProvider>(providers.includes('codex') ? 'codex' : 'openai');
  const provider: AIProvider = providers.includes(selection) ? selection : providers.includes('codex') ? 'codex' : 'openai';
  return { provider, setProvider: setSelection };
}

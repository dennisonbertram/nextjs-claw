// Settings live in browser localStorage and ride along with each /api/agent call.
// Server passes them to runAgent which adjusts subprocess env vars based on provider.

export type Provider = 'anthropic' | 'zai' | 'deepseek' | 'custom';
export type AuthMode = 'subscription' | 'api-key';
export type ModelChoice = 'default' | 'opus' | 'sonnet' | 'haiku';
export type EffortChoice = 'default' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface AgentSettings {
  provider: Provider;

  // Anthropic-only — ignored for other providers
  authMode: AuthMode;
  apiKey?: string;

  // Used for zai / deepseek / custom: a single auth token (becomes ANTHROPIC_AUTH_TOKEN)
  authToken?: string;

  // Only used when provider === 'custom' — must be Anthropic-API-compatible
  baseUrl?: string;

  // Shared
  model: ModelChoice;
  effort: EffortChoice;
}

export const DEFAULT_SETTINGS: AgentSettings = {
  provider: 'anthropic',
  authMode: 'subscription',
  model: 'default',
  effort: 'default',
};

const STORAGE_KEY = 'infinite-app-settings';

export function loadSettings(): AgentSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AgentSettings>;
    return {
      provider: validProvider(parsed.provider),
      authMode: parsed.authMode === 'api-key' ? 'api-key' : 'subscription',
      apiKey: stringOrUndef(parsed.apiKey),
      authToken: stringOrUndef(parsed.authToken),
      baseUrl: stringOrUndef(parsed.baseUrl),
      model: validModel(parsed.model),
      effort: validEffort(parsed.effort),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: AgentSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

function validProvider(v: unknown): Provider {
  return v === 'zai' || v === 'deepseek' || v === 'custom' ? v : 'anthropic';
}
function validModel(v: unknown): ModelChoice {
  return v === 'opus' || v === 'sonnet' || v === 'haiku' ? v : 'default';
}
function validEffort(v: unknown): EffortChoice {
  return v === 'low' || v === 'medium' || v === 'high' || v === 'xhigh' || v === 'max'
    ? v
    : 'default';
}
function stringOrUndef(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

// Hardcoded base URLs for known providers. Updated April 2026.
export const PROVIDER_BASE_URL: Record<Exclude<Provider, 'anthropic' | 'custom'>, string> = {
  zai: 'https://api.z.ai/api/anthropic',
  deepseek: 'https://api.deepseek.com/anthropic',
};

export const PROVIDER_LABEL: Record<Provider, string> = {
  anthropic: 'Anthropic',
  zai: 'Z.ai (GLM)',
  deepseek: 'DeepSeek',
  custom: 'Custom',
};

export function modelLabel(m: ModelChoice): string {
  return m === 'default' ? 'claude (default)' : m;
}

/** Resolved base URL for the provider (or undefined for native Anthropic). */
export function resolvedBaseUrl(s: AgentSettings): string | undefined {
  if (s.provider === 'anthropic') return undefined;
  if (s.provider === 'custom') return s.baseUrl;
  return PROVIDER_BASE_URL[s.provider];
}

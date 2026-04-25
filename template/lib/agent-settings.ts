// Settings live in browser localStorage and ride along with each /api/agent call.
// Server passes them to runAgent which adjusts subprocess env + CLI args.

export type AuthMode = 'subscription' | 'api-key';
export type ModelChoice = 'default' | 'opus' | 'sonnet' | 'haiku';
export type EffortChoice = 'default' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface AgentSettings {
  authMode: AuthMode;
  apiKey?: string;        // only used when authMode === 'api-key'; falls through to env if blank
  model: ModelChoice;
  effort: EffortChoice;
}

export const DEFAULT_SETTINGS: AgentSettings = {
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
      authMode: parsed.authMode === 'api-key' ? 'api-key' : 'subscription',
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : undefined,
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

function validModel(v: unknown): ModelChoice {
  return v === 'opus' || v === 'sonnet' || v === 'haiku' ? v : 'default';
}
function validEffort(v: unknown): EffortChoice {
  return v === 'low' || v === 'medium' || v === 'high' || v === 'xhigh' || v === 'max'
    ? v
    : 'default';
}

export function modelLabel(m: ModelChoice): string {
  return m === 'default' ? 'claude (default)' : m;
}

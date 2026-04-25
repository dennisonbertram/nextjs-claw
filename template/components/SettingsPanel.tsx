'use client';
import { useEffect, useState } from 'react';
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  type AgentSettings,
  type AuthMode,
  type ModelChoice,
  type EffortChoice,
  type Provider,
  PROVIDER_BASE_URL,
} from '@/lib/agent-settings';

interface Props {
  onClose: () => void;
  onChange?: (s: AgentSettings) => void;
}

const INK    = '#1a1816';
const MUTED  = '#6b6862';
const LINE   = '#e2dbc9';
const SUBTLE = '#ece6d5';
const ACCENT = '#c2410c';
const ACCENT_SOFT = '#fdf1e8';
const PANEL_BG = '#fffdf6';

export default function SettingsPanel({ onClose, onChange }: Props) {
  const [settings, setSettings] = useState<AgentSettings>(DEFAULT_SETTINGS);
  const [revealKey, setRevealKey] = useState(false);
  const [revealToken, setRevealToken] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  function update<K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      onChange?.(next);
      return next;
    });
  }

  function reset() {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    onChange?.(DEFAULT_SETTINGS);
  }

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px 18px 24px',
        background: PANEL_BG,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {/* Section: Provider */}
      <Section title="Provider" subtitle="Where do prompts go?">
        <SegRow
          value={settings.provider}
          options={[
            { value: 'anthropic', label: 'Anthropic' },
            { value: 'zai',       label: 'Z.ai' },
            { value: 'deepseek',  label: 'DeepSeek' },
            { value: 'custom',    label: 'Custom' },
          ]}
          onChange={(v) => update('provider', v as Provider)}
        />

        {settings.provider === 'anthropic' && (
          <div style={{ marginTop: 14 }}>
            <SegRow
              value={settings.authMode}
              options={[
                { value: 'subscription', label: 'Subscription' },
                { value: 'api-key', label: 'API key' },
              ]}
              onChange={(v) => update('authMode', v as AuthMode)}
            />
            {settings.authMode === 'api-key' && (
              <KeyInput
                label="ANTHROPIC_API_KEY"
                value={settings.apiKey ?? ''}
                placeholder="sk-ant-... (or leave blank to use shell env)"
                reveal={revealKey}
                onReveal={() => setRevealKey(v => !v)}
                onChange={(v) => update('apiKey', v)}
              />
            )}
            <p style={hintStyle}>
              {settings.authMode === 'subscription'
                ? <>Strips <code style={codeStyle}>ANTHROPIC_API_KEY</code> from the subprocess so the <code style={codeStyle}>claude</code> CLI uses your <code style={codeStyle}>claude login</code> keychain token.</>
                : <>Stored in this browser&apos;s localStorage. Sent to your local <code style={codeStyle}>claude</code> subprocess only.</>
              }
            </p>
          </div>
        )}

        {settings.provider === 'zai' && (
          <ProviderEndpoint
            preset={`Routes through ${PROVIDER_BASE_URL.zai} — Z.ai's Anthropic-compatible endpoint for GLM models. Use the same model dropdown below; Z.ai maps "opus" → glm-4.7, "sonnet" → glm-4.7, "haiku" → glm-4.5-air.`}
            tokenLabel="Z.ai API key"
            tokenValue={settings.authToken ?? ''}
            tokenPlaceholder="zai-... (get one at z.ai)"
            reveal={revealToken}
            onReveal={() => setRevealToken(v => !v)}
            onTokenChange={(v) => update('authToken', v)}
          />
        )}

        {settings.provider === 'deepseek' && (
          <ProviderEndpoint
            preset={`Routes through ${PROVIDER_BASE_URL.deepseek} — DeepSeek's Anthropic-compatible endpoint. Set custom Anthropic→DeepSeek model mappings via shell env (ANTHROPIC_DEFAULT_OPUS_MODEL=deepseek-v4-pro, etc.). Some Anthropic-only fields are ignored on this endpoint.`}
            tokenLabel="DeepSeek API key"
            tokenValue={settings.authToken ?? ''}
            tokenPlaceholder="sk-... (get one at platform.deepseek.com)"
            reveal={revealToken}
            onReveal={() => setRevealToken(v => !v)}
            onTokenChange={(v) => update('authToken', v)}
          />
        )}

        {settings.provider === 'custom' && (
          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>ANTHROPIC_BASE_URL</label>
            <input
              type="text"
              value={settings.baseUrl ?? ''}
              placeholder="https://your-proxy.example.com/anthropic"
              onChange={(e) => update('baseUrl', e.target.value)}
              style={inputStyle}
            />
            <KeyInput
              label="ANTHROPIC_AUTH_TOKEN"
              value={settings.authToken ?? ''}
              placeholder="bearer token (optional)"
              reveal={revealToken}
              onReveal={() => setRevealToken(v => !v)}
              onChange={(v) => update('authToken', v)}
            />
            <p style={hintStyle}>
              Use any Anthropic-API-compatible endpoint — LiteLLM proxy, OpenRouter,
              self-hosted gateway, etc.
            </p>
          </div>
        )}
      </Section>

      {/* Section: Model */}
      <Section title="Model" subtitle="Which model does the editing?">
        <SegRow
          value={settings.model}
          options={[
            { value: 'default', label: 'Default' },
            { value: 'opus', label: 'Opus' },
            { value: 'sonnet', label: 'Sonnet' },
            { value: 'haiku', label: 'Haiku' },
          ]}
          onChange={(v) => update('model', v as ModelChoice)}
        />
        <p style={hintStyle}>
          {settings.provider === 'anthropic'
            ? 'Default = whatever claude picks (currently Opus). Sonnet is faster/cheaper.'
            : 'Aliases are mapped by the upstream provider. If a tier doesn\'t resolve, switch to Default or override mapping via env.'}
        </p>
      </Section>

      {/* Section: Reasoning */}
      <Section title="Reasoning effort" subtitle="How hard does it think before acting?">
        <SegRow
          value={settings.effort}
          options={[
            { value: 'default', label: 'Default' },
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'xhigh', label: 'X-High' },
            { value: 'max', label: 'Max' },
          ]}
          onChange={(v) => update('effort', v as EffortChoice)}
        />
        <p style={hintStyle}>
          Higher = more careful, slower, more expensive. Some providers ignore this.
        </p>
      </Section>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 12 }}>
        <button onClick={reset} style={miniBtnStyle}>Reset to defaults</button>
        <button onClick={onClose} style={primaryBtnStyle}>Done</button>
      </div>
    </div>
  );
}

// ─── small building blocks ──────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: INK, letterSpacing: -0.1 }}>{title}</h3>
      {subtitle && <p style={{ margin: '2px 0 10px', fontSize: 11, color: MUTED }}>{subtitle}</p>}
      {children}
    </div>
  );
}

function SegRow<T extends string>({
  value, options, onChange,
}: {
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      style={{
        display: 'flex', flexWrap: 'wrap', gap: 4,
        padding: 3, borderRadius: 6, background: SUBTLE, border: `1px solid ${LINE}`,
      }}
    >
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            title={opt.hint}
            style={{
              flex: 1, minWidth: 64,
              padding: '6px 10px',
              border: active ? `1px solid ${ACCENT}55` : '1px solid transparent',
              background: active ? ACCENT_SOFT : 'transparent',
              color: active ? ACCENT : INK,
              fontSize: 12, fontWeight: active ? 600 : 500,
              cursor: 'pointer', borderRadius: 4,
              fontFamily: 'inherit',
              transition: 'background 120ms, color 120ms',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function KeyInput({ label, value, placeholder, reveal, onReveal, onChange }: {
  label: string;
  value: string;
  placeholder: string;
  reveal: boolean;
  onReveal: () => void;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <input
          type={reveal ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, fontFamily: 'var(--font-mono), JetBrains Mono, ui-monospace, monospace' }}
        />
        <button onClick={onReveal} title={reveal ? 'Hide' : 'Show'} style={miniBtnStyle}>
          {reveal ? 'hide' : 'show'}
        </button>
      </div>
    </div>
  );
}

function ProviderEndpoint({ preset, tokenLabel, tokenValue, tokenPlaceholder, reveal, onReveal, onTokenChange }: {
  preset: string;
  tokenLabel: string;
  tokenValue: string;
  tokenPlaceholder: string;
  reveal: boolean;
  onReveal: () => void;
  onTokenChange: (v: string) => void;
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <KeyInput
        label={tokenLabel}
        value={tokenValue}
        placeholder={tokenPlaceholder}
        reveal={reveal}
        onReveal={onReveal}
        onChange={onTokenChange}
      />
      <p style={hintStyle}>{preset}</p>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontFamily: 'var(--font-mono), JetBrains Mono, ui-monospace, monospace',
  color: MUTED,
  letterSpacing: 0.4,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  width: '100%',
  padding: '8px 10px',
  border: `1px solid ${LINE}`,
  borderRadius: 6,
  background: 'white',
  color: INK,
  fontSize: 12,
  outline: 'none',
};

const hintStyle: React.CSSProperties = {
  margin: '8px 0 0',
  fontSize: 11,
  lineHeight: 1.5,
  color: MUTED,
};

const codeStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono), JetBrains Mono, ui-monospace, monospace',
  fontSize: 11,
  background: SUBTLE,
  padding: '0 4px',
  borderRadius: 3,
  color: INK,
};

const miniBtnStyle: React.CSSProperties = {
  padding: '5px 10px',
  fontSize: 11,
  fontFamily: 'inherit',
  border: `1px solid ${LINE}`,
  background: 'transparent',
  color: MUTED,
  cursor: 'pointer',
  borderRadius: 5,
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '6px 16px',
  fontSize: 12,
  fontWeight: 500,
  fontFamily: 'inherit',
  border: 'none',
  background: ACCENT,
  color: 'white',
  cursor: 'pointer',
  borderRadius: 6,
};

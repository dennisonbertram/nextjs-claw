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
      {/* Section: Authentication */}
      <Section title="Authentication" subtitle="How does Claude run?">
        <SegRow
          value={settings.authMode}
          options={[
            { value: 'subscription', label: 'Subscription', hint: 'Uses your `claude login` token' },
            { value: 'api-key', label: 'API key', hint: 'Pay per request' },
          ]}
          onChange={(v) => update('authMode', v as AuthMode)}
        />
        {settings.authMode === 'api-key' && (
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>ANTHROPIC_API_KEY</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input
                type={revealKey ? 'text' : 'password'}
                value={settings.apiKey ?? ''}
                placeholder="sk-ant-... (or leave blank to use shell env)"
                onChange={(e) => update('apiKey', e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  border: `1px solid ${LINE}`,
                  borderRadius: 6,
                  background: 'white',
                  color: INK,
                  fontSize: 12,
                  fontFamily: 'var(--font-mono), JetBrains Mono, ui-monospace, monospace',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = ACCENT)}
                onBlur={(e) => (e.currentTarget.style.borderColor = LINE)}
              />
              <button
                onClick={() => setRevealKey(v => !v)}
                title={revealKey ? 'Hide' : 'Show'}
                style={miniBtnStyle}
              >
                {revealKey ? 'hide' : 'show'}
              </button>
            </div>
            <p style={hintStyle}>
              Stored only in this browser&apos;s localStorage. Never sent anywhere except your local{' '}
              <code style={codeStyle}>claude</code> subprocess.
            </p>
          </div>
        )}
        {settings.authMode === 'subscription' && (
          <p style={hintStyle}>
            <code style={codeStyle}>ANTHROPIC_API_KEY</code> is stripped from the subprocess so the{' '}
            <code style={codeStyle}>claude</code> CLI uses your keychain OAuth token from{' '}
            <code style={codeStyle}>claude login</code>.
          </p>
        )}
      </Section>

      {/* Section: Model */}
      <Section title="Model" subtitle="Which Claude does the editing?">
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
          Default uses whatever <code style={codeStyle}>claude</code> picks (currently Opus).
          Sonnet is faster and cheaper; Haiku is fastest but less capable on hard edits.
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
          Higher = more careful, slower, more expensive. Default is fine for everyday edits.
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

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontFamily: 'var(--font-mono), JetBrains Mono, ui-monospace, monospace',
  color: MUTED,
  letterSpacing: 0.4,
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

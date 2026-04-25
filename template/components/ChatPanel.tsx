'use client';
import { useEffect, useState } from 'react';
import MessageList from './MessageList';
import Composer from './Composer';
import HealthBanner from './HealthBanner';
import InfiniteLogo from './InfiniteLogo';
import SettingsPanel from './SettingsPanel';
import type { ChatMessage } from '@/lib/use-agent-stream';
import type { ElementRef } from '@/lib/react-source';
import { loadSettings, modelLabel, type AgentSettings } from '@/lib/agent-settings';

type Snap = 'rail' | 'default' | 'wide' | 'full';

interface Props {
  snap: Snap;
  setSnap: (s: Snap) => void;
  health: { ok: boolean; hint?: string } | null;
  messages: ChatMessage[];
  running: boolean;
  sessionId?: string;
  onSend: (prompt: string, refs?: ElementRef[]) => void;
  onStop: () => void;
  pickMode: boolean;
  onTogglePick: () => void;
  references: ElementRef[];
  onRemoveReference: (id: string) => void;
}

const INK    = '#1a1816';
const MUTED  = '#6b6862';
const LINE   = '#e2dbc9';
const SUBTLE = '#ece6d5';
const ACCENT = '#c2410c';
const ACCENT_SOFT = '#fdf1e8';

function SnapStepper({ snap, setSnap }: { snap: Snap; setSnap: (s: Snap) => void }) {
  const order: Snap[] = ['rail', 'default', 'wide', 'full'];
  const sizes: Record<Snap, [number, number]> = {
    rail:    [4, 12],
    default: [8, 12],
    wide:    [12, 12],
    full:    [16, 12],
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {order.map(s => {
        const [w, h] = sizes[s];
        const active = snap === s;
        return (
          <button
            key={s}
            onClick={() => setSnap(s)}
            title={s}
            aria-label={`Set panel to ${s}`}
            style={{
              background: 'none',
              border: 'none',
              padding: 4,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: w,
                height: h,
                borderRadius: 2,
                background: active ? ACCENT : 'transparent',
                border: `1.5px solid ${active ? ACCENT : MUTED}`,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function ChatPanel({
  snap, setSnap,
  health, messages, running, onSend, onStop,
  pickMode, onTogglePick, references, onRemoveReference,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AgentSettings | null>(null);

  useEffect(() => { setSettings(loadSettings()); }, []);

  const subtitleModel = settings ? modelLabel(settings.model) : 'claude-opus-4-7';

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>

      {/* Header */}
      <header
        style={{
          flexShrink: 0,
          padding: snap === 'full' ? '14px 16px 0 148px' : '14px 16px 0',
          borderBottom: `1px solid ${LINE}`,
          transition: 'padding 200ms',
        }}
      >
        {/* Top row: logo + title + controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          {/* Left: logo + two-line title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <InfiniteLogo size="header" running={running} />
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: -0.1,
                  color: INK,
                }}
              >
                the infinite app
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: MUTED,
                  fontFamily: 'var(--font-mono), JetBrains Mono, ui-monospace, monospace',
                  marginTop: 1,
                }}
              >
                {subtitleModel} · {running ? 'working' : 'idle'}
              </div>
            </div>
          </div>

          {/* Right: pick button + snap stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              onClick={onTogglePick}
              aria-pressed={pickMode}
              aria-label="Toggle pick mode"
              title="Pick element (P)"
              style={{
                width: 28,
                height: 28,
                background: pickMode ? ACCENT_SOFT : 'transparent',
                border: pickMode ? `1px solid ${ACCENT}55` : 'none',
                color: pickMode ? ACCENT : MUTED,
                cursor: 'pointer',
                borderRadius: 5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 1v3M7 10v3M1 7h3M10 7h3" />
                <circle cx="7" cy="7" r="1.5" />
              </svg>
            </button>
            <SnapStepper snap={snap} setSnap={setSnap} />
            <button
              onClick={() => setSettingsOpen(v => !v)}
              aria-pressed={settingsOpen}
              aria-label="Settings"
              title="Settings"
              style={{
                width: 28,
                height: 28,
                background: settingsOpen ? ACCENT_SOFT : 'transparent',
                border: settingsOpen ? `1px solid ${ACCENT}55` : 'none',
                color: settingsOpen ? ACCENT : MUTED,
                cursor: 'pointer',
                borderRadius: 5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 2,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
                <circle cx="7" cy="7" r="2" />
                <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.76 2.76l1.06 1.06M10.18 10.18l1.06 1.06M2.76 11.24l1.06-1.06M10.18 3.82l1.06-1.06" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {health && !health.ok && <HealthBanner hint={health.hint} />}

      {settingsOpen ? (
        <SettingsPanel
          onClose={() => setSettingsOpen(false)}
          onChange={(s) => setSettings(s)}
        />
      ) : (
        <>
          <MessageList
            messages={messages}
            running={running}
            onQuickPrompt={(prompt) => onSend(prompt)}
          />

          <Composer
            disabled={health ? !health.ok : false}
            running={running}
            onSend={onSend}
            onStop={onStop}
            references={references}
            onRemoveReference={onRemoveReference}
          />
        </>
      )}
    </div>
  );
}

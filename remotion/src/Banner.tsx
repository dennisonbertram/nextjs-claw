import React from 'react';
import { AbsoluteFill } from 'remotion';

// ─── colour tokens ────────────────────────────────────────────────────────────
const BG = '#0a0a0a';
const SURFACE = '#111111';
const SURFACE2 = '#161616';
const BORDER = 'rgba(255,255,255,0.07)';
const WHITE = '#ffffff';
const GRAY300 = '#d1d5db';
const GRAY400 = '#9ca3af';
const GRAY500 = '#6b7280';
const GRAY600 = '#4b5563';
const GRAY700 = '#374151';
const INDIGO = '#6366f1';
const INDIGO_DARK = '#4338ca';
const CYAN = '#22d3ee';
const PURPLE = '#a855f7';
const ORANGE = '#f97316';
const GREEN = '#22c55e';

// ─── Dot-grid background ─────────────────────────────────────────────────────
const DotGrid: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      backgroundImage:
        'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
      backgroundSize: '28px 28px',
      pointerEvents: 'none',
    }}
  />
);

// ─── Ambient glow blobs ───────────────────────────────────────────────────────
const AmbientGlow: React.FC = () => (
  <>
    {/* left glow — indigo */}
    <div
      style={{
        position: 'absolute',
        left: -80,
        top: -80,
        width: 480,
        height: 480,
        borderRadius: '50%',
        background:
          'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}
    />
    {/* right glow — cyan */}
    <div
      style={{
        position: 'absolute',
        right: -60,
        bottom: -60,
        width: 520,
        height: 520,
        borderRadius: '50%',
        background:
          'radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}
    />
    {/* center-right purple accent */}
    <div
      style={{
        position: 'absolute',
        right: 320,
        top: 40,
        width: 300,
        height: 300,
        borderRadius: '50%',
        background:
          'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}
    />
  </>
);

// ─── Feature pill ─────────────────────────────────────────────────────────────
const Pill: React.FC<{ label: string; color: string; bg: string }> = ({
  label,
  color,
  bg,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 11px',
      borderRadius: 999,
      background: bg,
      border: `1px solid ${color}33`,
      fontSize: 12,
      fontWeight: 600,
      color,
      letterSpacing: '0.02em',
      lineHeight: 1,
      whiteSpace: 'nowrap' as const,
    }}
  >
    {label}
  </div>
);

// ─── Terminal block ───────────────────────────────────────────────────────────
const Terminal: React.FC = () => (
  <div
    style={{
      background: '#0d0d0d',
      border: `1px solid ${BORDER}`,
      borderRadius: 10,
      padding: '14px 18px',
      fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
      fontSize: 14,
    }}
  >
    {/* window dots */}
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
      {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
        <div
          key={c}
          style={{ width: 10, height: 10, borderRadius: '50%', background: c }}
        />
      ))}
    </div>
    <div style={{ color: GRAY500, marginBottom: 4, fontSize: 12 }}>
      ~ my-app
    </div>
    <div>
      <span style={{ color: INDIGO }}>$ </span>
      <span style={{ color: GREEN }}>npx</span>
      <span style={{ color: WHITE }}> nextjs-claw </span>
      <span style={{ color: CYAN }}>my-app</span>
    </div>
    <div style={{ color: GRAY600, marginTop: 6, fontSize: 12 }}>
      ✔ Scaffolded · bun install · bun dev
    </div>
  </div>
);

// ─── Left panel ───────────────────────────────────────────────────────────────
const LeftPanel: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: 420,
      height: 640,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '48px 44px',
      boxSizing: 'border-box',
    }}
  >
    {/* open-source badge */}
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        background: 'rgba(99,102,241,0.12)',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: 999,
        padding: '5px 14px',
        marginBottom: 22,
        width: 'fit-content',
      }}
    >
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: INDIGO,
          boxShadow: `0 0 6px ${INDIGO}`,
        }}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: INDIGO,
          letterSpacing: '0.05em',
          textTransform: 'uppercase' as const,
        }}
      >
        Open Source
      </span>
    </div>

    {/* title */}
    <div
      style={{
        fontSize: 52,
        fontWeight: 800,
        color: WHITE,
        lineHeight: 1.05,
        letterSpacing: '-0.03em',
        fontFamily:
          '"SF Mono", "Fira Code", ui-monospace, SFMono-Regular, monospace',
        marginBottom: 14,
      }}
    >
      nextjs
      <span
        style={{
          background: `linear-gradient(135deg, ${INDIGO} 0%, ${CYAN} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        -claw
      </span>
    </div>

    {/* subtitle */}
    <div
      style={{
        fontSize: 16,
        color: GRAY400,
        lineHeight: 1.5,
        marginBottom: 28,
        fontWeight: 400,
      }}
    >
      A Next.js starter that{' '}
      <span style={{ color: GRAY300, fontWeight: 500 }}>builds itself.</span>
      <br />
      Chat with Claude. Watch your app rewrite.
    </div>

    {/* terminal */}
    <div style={{ marginBottom: 28 }}>
      <Terminal />
    </div>

    {/* feature pills */}
    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
      <Pill label="Next.js 16" color="#ffffff" bg="rgba(255,255,255,0.06)" />
      <Pill label="React 19" color={CYAN} bg="rgba(34,211,238,0.08)" />
      <Pill label="Claude AI" color={ORANGE} bg="rgba(249,115,22,0.1)" />
      <Pill label="Hot Reload" color={GREEN} bg="rgba(34,197,94,0.08)" />
      <Pill label="TypeScript" color={INDIGO} bg="rgba(99,102,241,0.1)" />
    </div>
  </div>
);

// ─── Divider between left and right panels ────────────────────────────────────
const PanelDivider: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 420,
      top: 40,
      bottom: 40,
      width: 1,
      background: `linear-gradient(to bottom, transparent, ${INDIGO}55 30%, ${CYAN}55 70%, transparent)`,
    }}
  />
);

// ─── Preview area (left side of right panel) ──────────────────────────────────
const PreviewPane: React.FC = () => (
  <div
    style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '18px 20px',
      gap: 14,
    }}
  >
    {/* tab bar */}
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {['page.tsx', 'globals.css', 'layout.tsx'].map((tab, i) => (
        <div
          key={tab}
          style={{
            padding: '4px 12px',
            borderRadius: 6,
            fontSize: 11,
            fontFamily: 'monospace',
            color: i === 0 ? WHITE : GRAY500,
            background: i === 0 ? 'rgba(255,255,255,0.08)' : 'transparent',
            border: i === 0 ? `1px solid ${BORDER}` : '1px solid transparent',
          }}
        >
          {tab}
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: GREEN,
          boxShadow: `0 0 6px ${GREEN}`,
        }}
      />
      <span style={{ fontSize: 10, color: GRAY500, marginLeft: 4 }}>live</span>
    </div>

    {/* code lines */}
    <div
      style={{
        flex: 1,
        fontFamily: '"SF Mono", "Fira Code", monospace',
        fontSize: 12,
        lineHeight: 1.8,
        color: GRAY600,
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 8,
        padding: '14px 16px',
        border: `1px solid ${BORDER}`,
        overflow: 'hidden',
      }}
    >
      {[
        { indent: 0, color: PURPLE, text: 'export default function' },
        { indent: 0, color: WHITE, text: ' Hero() {' },
        { indent: 1, color: INDIGO, text: 'return (' },
        { indent: 2, color: GRAY500, text: '<main className="dark">' },
        { indent: 3, color: CYAN, text: '<h1>' },
        { indent: 4, color: WHITE, text: 'Build something' },
        { indent: 3, color: CYAN, text: '</h1>' },
        { indent: 3, color: GRAY400, text: '<p>powered by Claude AI</p>' },
        { indent: 2, color: GRAY500, text: '</main>' },
        { indent: 1, color: INDIGO, text: ')' },
        { indent: 0, color: WHITE, text: '}' },
      ].map((line, i) => (
        <div key={i} style={{ display: 'flex' }}>
          <span
            style={{
              width: 28,
              color: GRAY700,
              fontSize: 10,
              userSelect: 'none',
              flexShrink: 0,
              textAlign: 'right',
              marginRight: 12,
              paddingTop: 1,
            }}
          >
            {i + 1}
          </span>
          <span
            style={{
              paddingLeft: line.indent * 16,
              color: line.color,
              whiteSpace: 'pre',
            }}
          >
            {line.text}
          </span>
        </div>
      ))}
    </div>

    {/* rendered preview card */}
    <div
      style={{
        borderRadius: 10,
        background: `linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(34,211,238,0.08) 100%)`,
        border: `1px solid rgba(99,102,241,0.2)`,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: WHITE,
          letterSpacing: '-0.02em',
        }}
      >
        Build something
      </div>
      <div style={{ fontSize: 13, color: GRAY400 }}>powered by Claude AI</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <div
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            background: INDIGO,
            fontSize: 12,
            fontWeight: 600,
            color: WHITE,
          }}
        >
          Get Started
        </div>
        <div
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${BORDER}`,
            fontSize: 12,
            color: GRAY300,
          }}
        >
          Learn More
        </div>
      </div>
    </div>
  </div>
);

// ─── Chat message ─────────────────────────────────────────────────────────────
const UserMsg: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
    <div
      style={{
        background: 'rgba(99,102,241,0.2)',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: '14px 14px 4px 14px',
        padding: '9px 14px',
        fontSize: 12,
        color: GRAY300,
        maxWidth: '82%',
        lineHeight: 1.5,
      }}
    >
      {text}
    </div>
  </div>
);

const AssistantMsg: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        maxWidth: '88%',
      }}
    >
      {/* avatar */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${ORANGE} 0%, ${PURPLE} 100%)`,
          flexShrink: 0,
          marginTop: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 700,
          color: WHITE,
        }}
      >
        C
      </div>
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${BORDER}`,
          borderRadius: '4px 14px 14px 14px',
          padding: '9px 14px',
          fontSize: 12,
          color: GRAY400,
          lineHeight: 1.5,
        }}
      >
        {text}
      </div>
    </div>
  </div>
);

// ─── Chat sidebar (right side of right panel) ─────────────────────────────────
const ChatSidebar: React.FC = () => (
  <div
    style={{
      width: 260,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      borderLeft: `1px solid ${BORDER}`,
      background: 'rgba(255,255,255,0.015)',
    }}
  >
    {/* header */}
    <div
      style={{
        padding: '14px 16px',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${ORANGE} 0%, ${PURPLE} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 800,
          color: WHITE,
        }}
      >
        C
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>Claude</div>
        <div style={{ fontSize: 10, color: GREEN }}>● online</div>
      </div>
    </div>

    {/* messages */}
    <div
      style={{
        flex: 1,
        padding: '14px 12px 8px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <UserMsg text="make it dark mode with a gradient hero" />
      <AssistantMsg text="Done — updated globals.css and page.tsx. The hero now uses a dark bg with indigo→cyan gradient." />
      <UserMsg text="add a features section below" />
      <AssistantMsg text="Added a 3-column features grid. Hot-reloading now..." />
      <UserMsg text="make the CTA button bigger" />
    </div>

    {/* input bar */}
    <div
      style={{
        padding: '10px 12px',
        borderTop: `1px solid ${BORDER}`,
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid rgba(255,255,255,0.1)`,
          borderRadius: 10,
          padding: '9px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ flex: 1, fontSize: 12, color: GRAY600 }}>
          Tell Claude what to build…
        </span>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: `linear-gradient(135deg, ${INDIGO} 0%, ${PURPLE} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            style={{ transform: 'rotate(90deg)' }}
          >
            <path
              d="M12 19V5M5 12l7-7 7 7"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
);

// ─── Right panel (mock app window) ────────────────────────────────────────────
const RightPanel: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 432,
      top: 32,
      right: 32,
      bottom: 32,
      borderRadius: 14,
      background: SURFACE,
      border: `1px solid ${BORDER}`,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
    }}
  >
    {/* title bar */}
    <div
      style={{
        height: 38,
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        gap: 8,
        background: SURFACE2,
        flexShrink: 0,
      }}
    >
      {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
        <div
          key={c}
          style={{ width: 10, height: 10, borderRadius: '50%', background: c }}
        />
      ))}
      <div style={{ flex: 1 }} />
      <div
        style={{
          padding: '3px 12px',
          borderRadius: 6,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${BORDER}`,
          fontSize: 11,
          color: GRAY500,
          fontFamily: 'monospace',
        }}
      >
        localhost:3000
      </div>
      <div style={{ flex: 1 }} />
      {/* hotkey hint */}
      <div style={{ fontSize: 10, color: GRAY700, fontFamily: 'monospace' }}>
        ⌘K to chat
      </div>
    </div>

    {/* main content row */}
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <PreviewPane />
      {/* thin resize handle */}
      <div
        style={{
          width: 3,
          background: `linear-gradient(to bottom, transparent, ${INDIGO}44 40%, ${CYAN}44 60%, transparent)`,
          flexShrink: 0,
          cursor: 'col-resize',
        }}
      />
      <ChatSidebar />
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
export const Banner: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BG, overflow: 'hidden' }}>
      <DotGrid />
      <AmbientGlow />

      {/* subtle horizontal separator gradient */}
      <div
        style={{
          position: 'absolute',
          left: 420,
          top: 0,
          bottom: 0,
          width: 1,
          background: `linear-gradient(to bottom, transparent, ${BORDER} 20%, ${BORDER} 80%, transparent)`,
        }}
      />

      <LeftPanel />
      <PanelDivider />
      <RightPanel />
    </AbsoluteFill>
  );
};

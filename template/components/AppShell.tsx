'use client';
import '@/app/shell.css';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import ChatPanel from './ChatPanel';
import InfiniteLogo from './InfiniteLogo';
import { useAgentStream } from '@/lib/use-agent-stream';
import type { PreviewFrameHandle } from './PreviewFrame';
import PreviewFrameComponent from './PreviewFrame';
import type { ElementRef } from '@/lib/react-source';

// ----- Snap state -----
type Snap = 'rail' | 'default' | 'wide' | 'full';

const SNAP_PX: Record<Exclude<Snap, 'full'>, number> = {
  rail:    56,
  default: 420,
  wide:    620,
};

// Palette tokens (shell only — preview keeps its own)
const PANEL  = '#f5f1e8';
const INK    = '#1a1816';
const MUTED  = '#6b6862';
const LINE   = '#e2dbc9';
const ACCENT = '#c2410c';

// ----- Rail collapsed panel -----
function RailPanel({ onExpand, running }: { onExpand: () => void; running: boolean }) {
  return (
    <div
      style={{
        width: 56,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '14px 0',
        gap: 12,
      }}
    >
      <InfiniteLogo size="rail" running={running} onClick={onExpand} title="Open chat" />
      <div style={{ flex: 1 }} />
      {/* Three stub icon buttons */}
      {[
        // Chat bubble
        <svg key="chat" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M5 8h6M8 5v6"/></svg>,
        // File
        <svg key="file" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="2" width="10" height="12" rx="1"/><path d="M5 6h6M5 9h6M5 12h4"/></svg>,
        // Check
        <svg key="check" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="12" height="10" rx="1"/><path d="M5 7l2 2 4-4"/></svg>,
      ].map((icon, i) => (
        <button
          key={i}
          style={{
            width: 28,
            height: 28,
            background: 'none',
            border: 'none',
            color: MUTED,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 5,
          }}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

// ----- Snap stepper -----
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

// ----- Drag handle -----
function DragHandle({ onMouseDown, dragging }: { onMouseDown: (e: React.MouseEvent) => void; dragging: boolean }) {
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        // positioned by AppShell via inline left calc
        width: 8,
        cursor: 'col-resize',
        zIndex: 5,
        transform: 'translateX(-50%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          left: '50%',
          width: dragging ? 2 : 1,
          background: dragging ? ACCENT : LINE,
          transform: 'translateX(-50%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 4,
          height: 40,
          borderRadius: 3,
          background: dragging ? ACCENT : 'transparent',
          opacity: dragging ? 1 : 0.001,
        }}
      />
    </div>
  );
}

// ----- Snap indicators (shown while dragging) -----
interface SnapIndicatorPoint { id: string; px: number; label: string }
function SnapIndicators({
  containerWidth,
  current,
  points,
}: {
  containerWidth: number;
  current: number;
  points: SnapIndicatorPoint[];
}) {
  const BG = '#faf7f2';
  return (
    <>
      {points.map(p => {
        const left = containerWidth - p.px;
        const active = Math.abs(current - p.px) < 40;
        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left,
              width: 1,
              background: active ? ACCENT : MUTED,
              opacity: active ? 0.6 : 0.15,
              pointerEvents: 'none',
              zIndex: 4,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: 6,
                fontSize: 10,
                fontFamily: 'var(--font-mono), JetBrains Mono, ui-monospace, monospace',
                color: active ? ACCENT : MUTED,
                background: BG,
                padding: '2px 6px',
                borderRadius: 3,
                whiteSpace: 'nowrap',
                border: `1px solid ${active ? ACCENT : 'transparent'}`,
              }}
            >
              {p.label} · {p.px}px
            </div>
          </div>
        );
      })}
    </>
  );
}

// ----- Main AppShell -----
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [snap, setSnap] = useState<Snap>('default');
  const [draggingWidth, setDraggingWidth] = useState<number | null>(null);
  const [health, setHealth] = useState<{ ok: boolean; hint?: string } | null>(null);
  const [pickMode, setPickMode] = useState(false);
  const [references, setReferences] = useState<ElementRef[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<PreviewFrameHandle>(null);
  const agent = useAgentStream();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/agent/health')
      .then(r => r.json())
      .then((j: { ok: boolean; hint?: string }) => {
        if (!cancelled) setHealth({ ok: j.ok, hint: j.hint });
      })
      .catch(() => { if (!cancelled) setHealth({ ok: false, hint: 'Health check failed.' }); });
    return () => { cancelled = true; };
  }, []);

  // Computed panel width
  const computedWidth = useMemo(() => {
    if (draggingWidth != null) return draggingWidth;
    if (snap === 'full') return 'full';
    return SNAP_PX[snap as Exclude<Snap, 'full'>];
  }, [snap, draggingWidth]);

  // Drag to resize
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const containerWidth = containerRef.current?.offsetWidth ?? 1200;
    const startWidth = typeof computedWidth === 'number' ? computedWidth : containerWidth;

    const onMove = (ev: MouseEvent) => {
      const dx = startX - ev.clientX;
      let next = startWidth + dx;
      next = Math.max(56, Math.min(containerWidth - 120, next));
      setDraggingWidth(next);
    };

    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const dx = startX - ev.clientX;
      const final = Math.max(56, Math.min(containerWidth - 120, startWidth + dx));
      // Snap to nearest target
      const targets: [Snap, number][] = [
        ['rail',    56],
        ['default', 420],
        ['wide',    620],
        ['full',    containerWidth],
      ];
      let best: Snap = 'default';
      let bestDist = Infinity;
      for (const [id, px] of targets) {
        const d = Math.abs(final - px);
        if (d < bestDist) { bestDist = d; best = id; }
      }
      setSnap(best);
      setDraggingWidth(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [computedWidth]);

  // Iframe messages
  const onIframeMessage = useCallback((data: unknown) => {
    const msg = data as { kind?: string; ref?: ElementRef; active?: boolean };
    if (msg?.kind === 'claw/ready') {
      iframeRef.current?.send({ kind: 'claw/pick-mode', active: pickMode });
    }
    if (msg?.kind === 'claw/pick' && msg.ref) {
      setReferences(prev => [...prev, msg.ref!]);
    }
    if (msg?.kind === 'claw/pick-mode') {
      setPickMode(!!msg.active);
    }
  }, [pickMode]);

  useEffect(() => {
    iframeRef.current?.send({ kind: 'claw/pick-mode', active: pickMode });
  }, [pickMode]);

  const togglePick = useCallback(() => setPickMode(v => !v), []);

  const removeReference = useCallback((id: string) => {
    setReferences(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleSend = useCallback(async (prompt: string, refs?: ElementRef[]) => {
    await agent.send(prompt, refs);
    setReferences([]);
    setPickMode(false);
  }, [agent]);

  const renderWidth =
    snap === 'full' && draggingWidth == null ? '100%' :
    typeof computedWidth === 'number' ? computedWidth : '100%';

  const containerWidth = containerRef.current?.offsetWidth ?? 1200;

  // Handle bar left position: containerWidth - renderWidth
  const handleLeft =
    typeof renderWidth === 'number'
      ? containerWidth - renderWidth
      : 0; // full mode = no handle

  return (
    <div
      ref={containerRef}
      data-claw-shell
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        background: '#faf7f2',
      }}
    >
      {/* Preview area */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          position: 'relative',
          transition: draggingWidth != null ? 'none' : 'filter 200ms',
          filter: snap === 'full' ? 'blur(2px) brightness(0.7)' : 'none',
        }}
      >
        <PreviewFrameComponent
          ref={iframeRef}
          src="/preview"
          onMessage={onIframeMessage}
        />
      </main>

      {/* Drag handle (hidden in full mode) */}
      {snap !== 'full' && (
        <div
          style={{ position: 'absolute', top: 0, bottom: 0, left: handleLeft, zIndex: 5 }}
        >
          <DragHandle onMouseDown={onDragStart} dragging={draggingWidth != null} />
        </div>
      )}

      {/* Snap indicators (while dragging) */}
      {draggingWidth != null && (
        <SnapIndicators
          containerWidth={containerWidth}
          current={draggingWidth}
          points={[
            { id: 'rail',    px: 56,  label: 'Rail' },
            { id: 'default', px: 420, label: 'Default' },
            { id: 'wide',    px: 620, label: 'Wide' },
          ]}
        />
      )}

      {/* Panel */}
      <aside
        style={{
          width: renderWidth,
          flexShrink: 0,
          background: PANEL,
          color: INK,
          borderLeft: snap === 'full' ? 'none' : `1px solid ${LINE}`,
          transition: draggingWidth != null ? 'none' : 'width 260ms cubic-bezier(0.32, 0.72, 0, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: snap === 'full' ? 'absolute' : 'relative',
          inset: snap === 'full' ? '0' : undefined,
          zIndex: snap === 'full' ? 10 : 1,
        }}
        aria-hidden={snap === 'rail'}
      >
        {snap === 'rail' ? (
          <RailPanel onExpand={() => setSnap('default')} running={agent.running} />
        ) : (
          <ChatPanel
            snap={snap}
            setSnap={setSnap}
            health={health}
            messages={agent.messages}
            running={agent.running}
            sessionId={agent.sessionId}
            onSend={handleSend}
            onStop={agent.stop}
            pickMode={pickMode}
            onTogglePick={togglePick}
            references={references}
            onRemoveReference={removeReference}
          />
        )}
      </aside>

      {/* Full-state → show preview button */}
      {snap === 'full' && (
        <button
          onClick={() => setSnap('default')}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 20,
            background: PANEL,
            color: INK,
            border: `1px solid ${LINE}`,
            padding: '6px 12px',
            fontSize: 12,
            borderRadius: 6,
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ← show preview
        </button>
      )}
    </div>
  );
}

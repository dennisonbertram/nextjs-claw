'use client';
import '@/app/shell.css';
import { useEffect, useState, useCallback, useRef } from 'react';
import ChatPanel from './ChatPanel';
import { useAgentStream } from '@/lib/use-agent-stream';
import type { PreviewFrameHandle } from './PreviewFrame';
import PreviewFrameComponent from './PreviewFrame';
import type { ElementRef } from '@/lib/react-source';

const PANEL_WIDTH = 420;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const [health, setHealth] = useState<{ ok: boolean; hint?: string } | null>(null);
  const [pickMode, setPickMode] = useState(false);
  const [references, setReferences] = useState<ElementRef[]>([]);
  const iframeRef = useRef<PreviewFrameHandle>(null);
  const agent = useAgentStream();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/agent/health')
      .then(r => r.json())
      .then((j: { ok: boolean; hint?: string }) => {
        if (!cancelled) {
          setHealth({ ok: j.ok, hint: j.hint });
        }
      })
      .catch(() => { if (!cancelled) setHealth({ ok: false, hint: 'Health check failed.' }); });
    return () => { cancelled = true; };
  }, []);

  // Handle messages from iframe (picks + ready)
  const onIframeMessage = useCallback((data: unknown) => {
    const msg = data as { kind?: string; ref?: ElementRef; active?: boolean };
    if (msg?.kind === 'claw/ready') {
      // Send current pick-mode state to bridge on ready
      iframeRef.current?.send({ kind: 'claw/pick-mode', active: pickMode });
    }
    if (msg?.kind === 'claw/pick' && msg.ref) {
      setReferences(prev => [...prev, msg.ref!]);
    }
    if (msg?.kind === 'claw/pick-mode') {
      setPickMode(!!msg.active);
    }
  }, [pickMode]);

  // Sync pick mode to iframe
  useEffect(() => {
    iframeRef.current?.send({ kind: 'claw/pick-mode', active: pickMode });
  }, [pickMode]);

  const toggle = useCallback(() => setOpen(v => !v), []);

  const togglePick = useCallback(() => setPickMode(v => !v), []);

  const removeReference = useCallback((id: string) => {
    setReferences(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleSend = useCallback(async (prompt: string, refs?: ElementRef[]) => {
    await agent.send(prompt, refs);
    setReferences([]);
    setPickMode(false);
  }, [agent]);

  return (
    <div data-claw-shell className="flex h-screen w-screen overflow-hidden">
      <main className="relative min-w-0 flex-1 bg-white">
        <PreviewFrameComponent
          ref={iframeRef}
          src="/preview"
          onMessage={onIframeMessage}
        />
        {!open && (
          <button
            onClick={toggle}
            aria-label="Open chat"
            className="fixed right-4 top-4 z-50 rounded-full border border-neutral-700 bg-neutral-900/90 px-3 py-2 text-sm shadow-lg hover:bg-neutral-800"
          >
            ✨ Chat
          </button>
        )}
      </main>
      <aside
        className="shrink-0 border-l border-neutral-800 bg-neutral-900 transition-[width] duration-300 ease-out overflow-hidden"
        style={{ width: open ? PANEL_WIDTH : 0 }}
        aria-hidden={!open}
      >
        <div style={{ width: PANEL_WIDTH }} className="h-full">
          <ChatPanel
            onClose={toggle}
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
        </div>
      </aside>
    </div>
  );
}

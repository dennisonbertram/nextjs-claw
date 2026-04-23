'use client';
import { useEffect, useState, useCallback } from 'react';
import ChatPanel from './ChatPanel';
import { useAgentStream } from '@/lib/use-agent-stream';

const PANEL_WIDTH = 420;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true); // open by default on first load
  const [health, setHealth] = useState<{ ok: boolean; hint?: string } | null>(null);
  const agent = useAgentStream();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/agent/health')
      .then(r => r.json())
      .then((j: { ok: boolean; hint?: string }) => { if (!cancelled) setHealth(j); })
      .catch(() => { if (!cancelled) setHealth({ ok: false, hint: 'Health check failed.' }); });
    return () => { cancelled = true; };
  }, []);

  const toggle = useCallback(() => setOpen(v => !v), []);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <main
        className="relative flex-1 overflow-auto transition-[margin] duration-300 ease-out"
      >
        {children}
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
            onSend={agent.send}
            onStop={agent.stop}
          />
        </div>
      </aside>
    </div>
  );
}

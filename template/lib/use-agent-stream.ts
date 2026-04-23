'use client';
import { useCallback, useRef, useState } from 'react';
import type { AgentEvent } from './agent-events';

export type ToolState = 'running' | 'ok' | 'err';

export interface TextPart { kind: 'text'; text: string; }
export interface ToolPart {
  kind: 'tool';
  id: string;
  name: string;
  target?: string;
  state: ToolState;
  summary?: string;
}
export type MessagePart = TextPart | ToolPart;

export interface ChatMessage {
  role: 'user' | 'assistant';
  text?: string;        // for user messages
  parts: MessagePart[]; // for assistant messages; empty for user
}

export interface UseAgentStream {
  messages: ChatMessage[];
  running: boolean;
  sessionId?: string;
  send: (prompt: string) => Promise<void>;
  stop: () => void;
}

// --- pure helpers (always clone, never mutate) ---

function appendTextToLastAssistant(prev: ChatMessage[], delta: string): ChatMessage[] {
  if (prev.length === 0) return prev;
  const last = prev[prev.length - 1];
  if (last.role !== 'assistant') return prev;

  const parts = last.parts;
  const lastPart = parts.length > 0 ? parts[parts.length - 1] : null;

  let newParts: MessagePart[];
  if (lastPart && lastPart.kind === 'text') {
    // merge into existing text part
    newParts = [
      ...parts.slice(0, parts.length - 1),
      { kind: 'text' as const, text: lastPart.text + delta },
    ];
  } else {
    // push a new text part
    newParts = [...parts, { kind: 'text' as const, text: delta }];
  }

  return [...prev.slice(0, prev.length - 1), { ...last, parts: newParts }];
}

function appendToolToLastAssistant(prev: ChatMessage[], tool: ToolPart): ChatMessage[] {
  if (prev.length === 0) return prev;
  const last = prev[prev.length - 1];
  if (last.role !== 'assistant') return prev;
  return [
    ...prev.slice(0, prev.length - 1),
    { ...last, parts: [...last.parts, tool] },
  ];
}

function updateToolState(
  prev: ChatMessage[],
  id: string,
  state: ToolState,
  summary?: string,
): ChatMessage[] {
  return prev.map(msg => {
    if (msg.role !== 'assistant') return msg;
    const parts = msg.parts.map(p => {
      if (p.kind === 'tool' && p.id === id) {
        return { ...p, state, summary: summary ?? p.summary };
      }
      return p;
    });
    return { ...msg, parts };
  });
}

// --- event → message mutations ---

function applyEvent(
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setSessionId: React.Dispatch<React.SetStateAction<string | undefined>>,
  ev: AgentEvent,
) {
  switch (ev.type) {
    case 'session':
      setSessionId(ev.sessionId);
      return;
    case 'text_delta':
      setMessages(prev => appendTextToLastAssistant(prev, ev.content));
      return;
    case 'tool_use':
      setMessages(prev => appendToolToLastAssistant(prev, {
        kind: 'tool',
        id: ev.id,
        name: ev.name,
        target: ev.target,
        state: 'running',
      }));
      return;
    case 'tool_result':
      setMessages(prev => updateToolState(prev, ev.id, ev.ok ? 'ok' : 'err', ev.summary));
      return;
    case 'message_end':
      return;
    case 'result':
      return; // could show total cost/duration as a footer
    case 'error':
      setMessages(prev => appendTextToLastAssistant(prev, `\n\n[error] ${ev.message}`));
      return;
  }
}

// --- the hook ---

export function useAgentStream(): UseAgentStream {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
  }, []);

  const send = useCallback(async (prompt: string) => {
    if (running) return;
    const userMsg: ChatMessage = { role: 'user', text: prompt, parts: [] };
    const assistantMsg: ChatMessage = { role: 'assistant', parts: [] };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setRunning(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, sessionId }),
        signal: ctrl.signal,
      });
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        // SSE frames are separated by \n\n. Each starts with "data: "
        let sep: number;
        while ((sep = buf.indexOf('\n\n')) !== -1) {
          const frame = buf.slice(0, sep);
          buf = buf.slice(sep + 2);
          const line = frame.startsWith('data: ') ? frame.slice(6) : frame;
          if (!line) continue;
          try {
            const ev = JSON.parse(line) as AgentEvent;
            applyEvent(setMessages, setSessionId, ev);
          } catch { /* skip malformed */ }
        }
      }
    } catch (e) {
      if ((e as { name?: string })?.name !== 'AbortError') {
        setMessages(prev => appendTextToLastAssistant(prev, `\n\n[error] ${(e as Error).message}`));
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [running, sessionId]);

  return { messages, running, sessionId, send, stop };
}

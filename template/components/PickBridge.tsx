'use client';
import { useEffect, useRef, useState } from 'react';
import { getElementRef } from '@/lib/react-source';

export default function PickBridge() {
  const [active, setActive] = useState(false);
  const [projectRoot, setProjectRoot] = useState<string>('');
  const overlayRef = useRef<HTMLDivElement>(null);

  // ── parent messages ──
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { kind?: string; active?: boolean; projectRoot?: string };
      if (data?.kind === 'claw/pick-mode') setActive(!!data.active);
      if (data?.kind === 'claw/init' && typeof data.projectRoot === 'string') setProjectRoot(data.projectRoot);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ kind: 'claw/ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // ── pick mode handlers ──
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const prevCursor = html.style.cursor;
    html.style.cursor = 'crosshair';

    const onMove = (e: MouseEvent) => {
      const t = document.elementFromPoint(e.clientX, e.clientY);
      if (!t || !overlayRef.current) return;
      if (t === overlayRef.current || overlayRef.current.contains(t)) return;
      const rect = (t as HTMLElement).getBoundingClientRect();
      const o = overlayRef.current;
      o.style.left = rect.left + 'px';
      o.style.top = rect.top + 'px';
      o.style.width = rect.width + 'px';
      o.style.height = rect.height + 'px';
      o.style.display = 'block';
    };

    const onClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const t = document.elementFromPoint(e.clientX, e.clientY);
      if (!t || t === overlayRef.current) return;
      const ref = getElementRef(t, projectRoot);
      if (ref) {
        window.parent.postMessage({ kind: 'claw/pick', ref }, window.location.origin);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.parent.postMessage({ kind: 'claw/pick-mode', active: false }, window.location.origin);
      }
    };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      html.style.cursor = prevCursor;
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [active, projectRoot]);

  if (!active) return null;
  return (
    <div
      ref={overlayRef}
      aria-hidden
      style={{
        display: 'none',
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 2147483647,
        border: '2px solid #818cf8',
        background: 'rgba(99, 102, 241, 0.08)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.1)',
        transition: 'all 60ms ease-out',
      }}
    />
  );
}

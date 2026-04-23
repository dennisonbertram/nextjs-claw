'use client';
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

interface Props {
  src: string;
  onMessage?: (data: unknown) => void;
}

export interface PreviewFrameHandle {
  send(msg: unknown): void;
}

const PreviewFrame = forwardRef<PreviewFrameHandle, Props>(function PreviewFrame({ src, onMessage }, ref) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useImperativeHandle(ref, () => ({
    send(msg: unknown) {
      iframeRef.current?.contentWindow?.postMessage(msg, window.location.origin);
    },
  }));

  useEffect(() => {
    if (!onMessage) return;
    const handler = (e: MessageEvent) => {
      if (iframeRef.current && e.source === iframeRef.current.contentWindow) {
        onMessage(e.data);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onMessage]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      className="h-full w-full border-0 bg-white"
      title="App preview"
      // sandbox intentionally OMITTED — we want full same-origin script execution
      // (it's our own origin anyway, plus picker needs full DOM access)
    />
  );
});

export default PreviewFrame;

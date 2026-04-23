export default function HealthBanner({ hint }: { hint?: string }) {
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
      <p className="font-semibold">Claude Code CLI not found</p>
      <p className="mt-1 text-amber-200/80">{hint ?? 'Install and log in, then reload this page.'}</p>
    </div>
  );
}

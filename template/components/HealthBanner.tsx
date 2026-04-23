export default function HealthBanner({ hint }: { hint?: string }) {
  return (
    <div
      style={{
        borderBottom: '1px solid rgba(245, 158, 11, 0.4)',
        background: 'rgba(254, 243, 199, 0.6)',
        padding: '8px 16px',
        fontSize: 12,
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, color: '#92400e' }}>Claude Code CLI not found</p>
      <p style={{ margin: '4px 0 0', color: '#b45309' }}>
        {hint ?? 'Install and log in, then reload this page.'}
      </p>
    </div>
  );
}

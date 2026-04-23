import { spawnSync } from 'node:child_process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = spawnSync('claude', ['--version'], {
      encoding: 'utf8',
      timeout: 2000,
    });
    if (res.error || res.status !== 0) throw res.error ?? new Error('nonzero exit');
    const version = (res.stdout || res.stderr).trim();
    return Response.json({ ok: true, claudeVersion: version });
  } catch {
    return Response.json({
      ok: false,
      hint:
        'Install Claude Code CLI: `npm i -g @anthropic-ai/claude-code`, then run `claude login`.',
    });
  }
}

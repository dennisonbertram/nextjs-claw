# Security policy

## Supported versions

`nextjs-claw` is on a rolling-release cycle. Only the **latest minor version on npm** receives security fixes. Older versions are abandoned in place — if you find a vuln in `0.2.x` and we're already on `0.3.x`, the fix lands in the next `0.3.x` patch.

## Reporting a vulnerability

**Do not open a public GitHub issue.** Email the maintainer (see `package.json` `author`) or open a [private security advisory](https://github.com/dennisonbertram/nextjs-claw/security/advisories/new) on GitHub.

Include:

1. The exact version (`npm view nextjs-claw version` → state which release you tested).
2. Reproduction steps.
3. Impact assessment: who could be hurt, what could be exfiltrated, what privileges does the attacker need.
4. (Optional) suggested fix.

You'll get an acknowledgement within **48 hours** and a target patch date within **7 days**. Coordinated disclosure is preferred — please give us a reasonable window before going public.

## Scope

In scope:

- The `nextjs-claw` CLI itself (`bin/create.js`)
- The scaffolded template (`template/**`)
  - `lib/agent-engine.ts` — subprocess spawning, env handling
  - `app/api/agent/**` — SSE streaming, request validation
  - `lib/react-source.ts` — picker, postMessage handling

Out of scope:

- The `claude` CLI itself (report to Anthropic directly)
- Third-party providers (Z.ai, DeepSeek, etc.) — report to them
- Dependencies of the template (Next.js, React, Tailwind) — report upstream
- DoS attacks against the local dev server (it's local-only by design)

## Known caveats (not vulns, but worth flagging)

- **`acceptEdits` permission mode**: the spawned `claude` subprocess runs with `--permission-mode acceptEdits`, meaning it can edit any file under `--add-dir <projectRoot>` without prompting. This is intentional for the "app builds itself" UX. The system prompt directs it to stay within `app/preview/**` and refuse infrastructure edits, but a sufficiently determined prompt could still convince it otherwise. **Don't run `nextjs-claw` against a project containing secrets you don't want a model to read.**
- **API key in localStorage**: when using non-Anthropic providers, the auth token is stored in your browser's localStorage. Local-only by design. Clear it via Settings → Reset to defaults if you share the browser.
- **`ANTHROPIC_API_KEY=''` for third-party providers**: per Anthropic's docs convention. If your shell has a real `ANTHROPIC_API_KEY`, the third-party-provider mode explicitly blanks it for the subprocess so the CLI doesn't fall back to talking to api.anthropic.com.

## Hall of fame

(Empty — be the first.)

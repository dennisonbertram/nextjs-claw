# Changelog

All notable changes to this project. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); we try to use [SemVer](https://semver.org/).

## [0.3.1] — 2026-04-25

### Added
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `SECURITY.md`
- `.github/` issue and PR templates
- README open-source signaling — explicit MIT statement, contribution call-out

### Changed
- README rewritten with clearer open-source posture

## [0.3.0] — 2026-04-25

### Added
- **Provider switching** in Settings panel: Anthropic / Z.ai / DeepSeek / Custom
  - Z.ai routes via `https://api.z.ai/api/anthropic` (GLM-4.7 / glm-4.5-air)
  - DeepSeek routes via `https://api.deepseek.com/anthropic`
  - Custom takes any Anthropic-API-compatible base URL (LiteLLM, OpenRouter, self-hosted)
- Engine sets the right env vars per provider (`ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN`, blank `ANTHROPIC_API_KEY` for third-party)

### Changed
- Settings panel layout reorganized: Provider segmented control at top, conditional auth blocks per provider

## [0.2.0] — 2026-04-25

### Added
- **Settings panel** behind a gear icon in the chat header
  - Auth mode toggle (Subscription / API key)
  - Model dropdown (Default / Opus / Sonnet / Haiku) — passes `--model` to the CLI
  - Reasoning effort dropdown (Default / Low / Medium / High / X-High / Max) — passes `--effort`
- Settings persist in browser localStorage
- Header subtitle dynamically reflects selected model

## [0.1.0] — 2026-04-24

### Added
- Initial release: `npx nextjs-claw <dir>` scaffolds a Next.js 16 + React 19 + Tailwind v4 app with a built-in Claude chat panel
- Iframe isolation: chat at `/`, user app at `/preview`
- Element picker (`⌖ Pick` button) — click any DOM element in the preview to attach as a reference chip in the composer
- 4 snap states: rail / default / wide / fullscreen, drag-to-resize with snap indicators
- Template picker with 12 visual recipes
- Stack cookbook: 16 self-hosted recipes (Postgres, auth, email, jobs, uploads, etc.) the agent consults on demand
- Cream + coral palette (Direction A from the Claude Design handoff)
- MIT licensed

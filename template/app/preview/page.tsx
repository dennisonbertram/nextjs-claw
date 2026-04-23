// app/preview/page.tsx
export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16">
      <section className="text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
          The Infinite App
        </p>
        <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          I am an empty canvas.
        </h1>
        <h2 className="mt-2 text-2xl font-medium text-neutral-400 sm:text-3xl">
          Describe me.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-neutral-400">
          Describe what you want in the chat, or click an element here and reference it directly.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <a href="#" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500">
            Get started
          </a>
          <a href="https://github.com/anthropics/claude-code" className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-800">
            Claude Code
          </a>
        </div>
      </section>

      <section className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        <Tile title="Ask for anything" body="Landing pages, dashboards, forms, widgets — describe it in plain English." />
        <Tile title="Point and edit" body="Click an element in this preview to reference it in your next message." />
        <Tile title="Your subscription" body="Uses your Claude Code CLI login. No API key configuration needed." />
      </section>
    </div>
  );
}

function Tile({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
      <h3 className="text-sm font-semibold text-neutral-100">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-neutral-400">{body}</p>
    </div>
  );
}

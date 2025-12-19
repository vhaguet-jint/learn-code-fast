'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-lg bg-slate-800/60 text-sm text-slate-300">
      Loading editor...
    </div>
  ),
});

export default function Home() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
  const starter = useMemo(
    () =>
      `# Start small, ship fast\nfrom typing import Any\n\n\nasync def handler(payload: dict[str, Any]) -> dict[str, Any]:\n    name = payload.get('name', 'world')\n    return {"message": f"Hello, {name}!"}\n\n\nif __name__ == "__main__":\n    import asyncio\n\n    print(asyncio.run(handler({"name": "Learner"})))\n`,
    [],
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
            Learn Code Fast · MVP
          </p>
          <h1 className="text-4xl font-bold md:text-5xl">Self-hosted code learning playground</h1>
          <p className="max-w-3xl text-lg text-slate-300">
            FastAPI, Next.js, Redis, Celery, and PostgreSQL ready to run in containers. Add your Azure OpenAI key and
            start testing prompts or code exercises.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-indigo-200">Backend: FastAPI</span>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-200">Workers: Celery + Redis</span>
            <span className="rounded-full bg-sky-500/10 px-3 py-1 text-sky-200">Frontend: Next.js + Tailwind</span>
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-200">Editor: Monaco</span>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-indigo-900/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Backend</p>
                <h2 className="text-2xl font-semibold">API & Workers</h2>
              </div>
              <span className="rounded-md bg-slate-800 px-3 py-1 text-xs text-slate-300">{apiBase}</span>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              Uvicorn exposes a health endpoint, and a demo Celery job is ready for quick testing. Plug in your Azure AI
              Foundry prompts to evaluate code asynchronously.
            </p>
            <div className="mt-4 space-y-2 text-xs text-slate-400">
              <p>• GET {apiBase}/health</p>
              <p>• POST {apiBase}/jobs/echo</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-indigo-900/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Playground</p>
                <h2 className="text-2xl font-semibold">Monaco Editor</h2>
              </div>
              <span className="rounded-md bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">TypeScript & Python</span>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              The editor is ready for your snippets. Wire it to the API to submit code to workers for evaluation.
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
              <MonacoEditor
                height="320px"
                language="python"
                theme="vs-dark"
                value={starter}
                options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false }}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-lg bg-slate-800/60 text-sm text-slate-300">
      Loading editor...
    </div>
  ),
});

const placeholderMarkdown = `### Goal
Write a function **count_vowels** that returns the number of vowels in a string.

### Requirements
- Only count vowels: a, e, i, o, u (case-insensitive)
- Return an integer
- Include basic error handling for non-string inputs

### Example
\`\`\`python
assert count_vowels("Hello") == 2
assert count_vowels("rhythms") == 0
\`\`\``;

export default function Home() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
  const starter = useMemo(
    () =>
      `def count_vowels(text: str) -> int:\n    vowels = set("aeiouAEIOU")\n    return sum(1 for char in text if char in vowels)\n\n\nif __name__ == "__main__":\n    print(count_vowels("Learn Code Fast"))\n`,
    [],
  );

  const [editorValue, setEditorValue] = useState(starter);
  const [exerciseTitle, setExerciseTitle] = useState('Count vowels');
  const [exerciseDifficulty, setExerciseDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [promptMarkdown, setPromptMarkdown] = useState(placeholderMarkdown);
  const [terminalLines, setTerminalLines] = useState<string[]>([
    '💡 Terminal ready. Use the buttons to run or request new exercises.',
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingExercise, setIsLoadingExercise] = useState(false);

  const appendLine = (line: string) => setTerminalLines((prev) => [...prev.slice(-10), line]);

  const handleRun = async () => {
    setIsRunning(true);
    appendLine('▶️ Sending code to backend (stub). Waiting for execution result...');

    await new Promise((resolve) => setTimeout(resolve, 1000));

    appendLine('✅ Execution complete. (Connect to POST /exercises/{id}/run)');
    setIsRunning(false);
  };

  const handleGenerate = async () => {
    setIsLoadingExercise(true);
    appendLine('✨ Requesting a new exercise from the backend (stub)...');

    await new Promise((resolve) => setTimeout(resolve, 800));

    setExerciseTitle('Two Sum (LLM draft)');
    setExerciseDifficulty('medium');
    setPromptMarkdown(`### Goal
Return the indices of two numbers in an array that add up to a target.

### Rules
- Input: list of integers and target integer
- Output: tuple with two indices (order does not matter)
- Raise a \`ValueError\` if no combination is found

### Example
\`\`\`python
assert two_sum([2, 7, 11, 15], 9) == (0, 1)
\`\`\`

### Notes
Keep the solution O(n) by using a hash map.`);
    setEditorValue(`# Two Sum starter\nfrom typing import List, Tuple\n\n\nclass Solution:\n    def two_sum(self, nums: List[int], target: int) -> Tuple[int, int]:\n        seen = {}\n        for idx, value in enumerate(nums):\n            if target - value in seen:\n                return seen[target - value], idx\n            seen[value] = idx\n        raise ValueError("No solution found")\n`);
    appendLine('📥 New prompt received. (Connect to POST /exercises/generate)');

    setIsLoadingExercise(false);
  };

  const handleResetEditor = () => {
    setEditorValue(starter);
    setExerciseTitle('Count vowels');
    setExerciseDifficulty('easy');
    setPromptMarkdown(placeholderMarkdown);
    appendLine('↩️ Editor reset to starter template.');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">Learn Code Fast</p>
          <h1 className="text-4xl font-bold md:text-5xl">Exercise playground</h1>
          <p className="max-w-3xl text-lg text-slate-300">
            Four-pane UI to explore LLM-generated coding tasks, edit code with Monaco, and run solutions once backend
            endpoints are available.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-indigo-200">Backend base: {apiBase}</span>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-200">Editor: Monaco</span>
            <span className="rounded-full bg-sky-500/10 px-3 py-1 text-sky-200">Markdown: ReactMarkdown</span>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:grid-rows-[repeat(2,minmax(320px,1fr))]">
          {/* Top left - Markdown prompt */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-indigo-900/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Prompt</p>
                <h2 className="text-2xl font-semibold">{exerciseTitle}</h2>
              </div>
              <span
                className={`rounded-md px-3 py-1 text-xs font-semibold capitalize ${exerciseDifficulty === 'easy'
                    ? 'bg-emerald-500/10 text-emerald-200'
                    : exerciseDifficulty === 'medium'
                      ? 'bg-amber-500/10 text-amber-200'
                      : 'bg-rose-500/10 text-rose-200'
                  }`}
              >
                {exerciseDifficulty}
              </span>
            </div>
            <div className="mt-4 h-full overflow-auto rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">
              <ReactMarkdown className="prose prose-invert max-w-none prose-pre:bg-slate-900 prose-pre:text-slate-100">
                {promptMarkdown}
              </ReactMarkdown>
            </div>
          </div>

          {/* Top right - Monaco editor */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-indigo-900/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Editor</p>
                <h2 className="text-2xl font-semibold">Solution workspace</h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="rounded-md bg-slate-800 px-2 py-1">Python</span>
                <span className="rounded-md bg-slate-800 px-2 py-1">Monaco</span>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
              <MonacoEditor
                height="320px"
                language="python"
                theme="vs-dark"
                value={editorValue}
                onChange={(val) => setEditorValue(val ?? '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>

          {/* Bottom left - Controls and metadata */}
          <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-indigo-900/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Flow</p>
                <h2 className="text-2xl font-semibold">Exercise controls</h2>
              </div>
              <div className="flex gap-2 text-xs text-slate-300">
                <span className="rounded-md bg-slate-800 px-2 py-1">Generate</span>
                <span className="rounded-md bg-slate-800 px-2 py-1">Reset</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoadingExercise}
                className="rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingExercise ? 'Loading exercise...' : 'Generate exercise'}
              </button>
              <button
                type="button"
                onClick={handleResetEditor}
                className="rounded-lg border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-indigo-400 hover:text-indigo-200"
              >
                Reset editor
              </button>
              <button
                type="button"
                onClick={handleRun}
                disabled={isRunning}
                className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRunning ? 'Running...' : 'Run in sandbox'}
              </button>
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
                <p className="font-semibold text-slate-200">API hookup (planned)</p>
                <ul className="mt-2 space-y-1 list-disc list-inside text-slate-400">
                  <li>POST {apiBase}/exercises/generate</li>
                  <li>POST {apiBase}/exercises/{"{id}"}/run</li>
                  <li>POST {apiBase}/exercises/{"{id}"}/submit</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom right - Terminal */}
          <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-indigo-900/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Terminal</p>
                <h2 className="text-2xl font-semibold">Execution logs</h2>
              </div>
              <button
                type="button"
                onClick={() => setTerminalLines([])}
                className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 transition hover:border-indigo-400 hover:text-indigo-200"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-auto rounded-lg border border-slate-800 bg-slate-950/60 p-3 font-mono text-sm text-slate-200">
              {terminalLines.length === 0 ? (
                <p className="text-slate-500">Terminal cleared.</p>
              ) : (
                <ul className="space-y-1">
                  {terminalLines.map((line, idx) => (
                    <li key={`${line}-${idx}`} className="whitespace-pre-wrap">
                      {line}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

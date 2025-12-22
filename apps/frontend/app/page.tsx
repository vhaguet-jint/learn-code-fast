'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
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

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface UiContextSnapshot {
  exerciseId: string | null;
  exerciseTitle: string;
  exerciseDifficulty: 'easy' | 'medium' | 'hard';
  promptMarkdown: string;
  editorValue: string;
  terminalLines: string[];
}

interface UserContext {
  user_id: string;
  profile: {
    role: string;
    age_range?: string | null;
    timezone?: string | null;
    preferred_languages: string[];
    learning_preferences: {
      modality: string;
      notes?: string | null;
    }[];
  };
  languages: {
    name: string;
    proficiency: string;
    years_experience?: number | null;
    primary_frameworks: string[];
  }[];
  learning_goals: string[];
  strengths: string[];
  opportunities: string[];
  last_updated: string;
  version: string;
}

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
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [promptMarkdown, setPromptMarkdown] = useState(placeholderMarkdown);
  const [terminalLines, setTerminalLines] = useState<string[]>([
    '💡 Terminal ready. Use the buttons to run or request new exercises.',
  ]);
  const defaultSystemPrompt =
    'You are a helpful coding tutor. Be concise, provide actionable suggestions, and keep explanations grounded in the user context.';
  const [systemPrompt, setSystemPrompt] = useState<string>(defaultSystemPrompt);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingExercise, setIsLoadingExercise] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! I\'m here to help you with your coding exercise. Ask me anything about the problem, hints, or how to approach it!' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const buildUiContextSnapshot = (): UiContextSnapshot => ({
    exerciseId,
    exerciseTitle,
    exerciseDifficulty,
    promptMarkdown,
    editorValue,
    terminalLines,
  });

  const formatUiContext = (context: UiContextSnapshot): string => {
    // Future guardrails: limit token counts, sanitize user-provided markdown, and strip prompt injections.
    const exerciseLine = context.exerciseId
      ? `Exercise: ${context.exerciseTitle} (${context.exerciseDifficulty}).`
      : 'Exercise: none loaded.';
    const promptLine = context.promptMarkdown
      ? `Prompt markdown: ${context.promptMarkdown}`
      : 'Prompt markdown: none.';
    const codeLine = context.editorValue ? `Current code:\n${context.editorValue}` : 'Current code: empty.';
    const terminalLine =
      context.terminalLines.length > 0
        ? `Recent terminal logs:\n${context.terminalLines.join('\n')}`
        : 'Recent terminal logs: none.';

    return [exerciseLine, promptLine, codeLine, terminalLine].join('\n');
  };

  const buildSystemPromptFromContext = (context: UserContext, uiContext: UiContextSnapshot): string => {
    const languagesSummary =
      context.languages.length > 0
        ? context.languages
            .map((lang) => {
              const experience = lang.years_experience != null ? `${lang.years_experience} yrs` : 'unspecified exp';
              const frameworks = lang.primary_frameworks.length > 0 ? `frameworks: ${lang.primary_frameworks.join(', ')}` : 'frameworks: none listed';
              return `${lang.name} (${lang.proficiency}, ${experience}; ${frameworks})`;
            })
            .join('; ')
        : 'No languages recorded.';

    const learningPreferences =
      context.profile.learning_preferences.length > 0
        ? context.profile.learning_preferences
            .map((pref) => (pref.notes ? `${pref.modality} (${pref.notes})` : pref.modality))
            .join('; ')
        : 'No learning preferences provided.';

    const goals = context.learning_goals.length > 0 ? context.learning_goals.join('; ') : 'No active goals listed.';
    const strengths = context.strengths.length > 0 ? context.strengths.join('; ') : 'No strengths provided.';
    const opportunities =
      context.opportunities.length > 0 ? context.opportunities.join('; ') : 'No growth areas captured.';

    const profileDetails = [context.profile.role];
    if (context.profile.age_range) profileDetails.push(`age ${context.profile.age_range}`);
    if (context.profile.timezone) profileDetails.push(`timezone ${context.profile.timezone}`);
    if (context.profile.preferred_languages.length > 0)
      profileDetails.push(`prefers ${context.profile.preferred_languages.join(', ')} explanations`);

    return [
      `You are a coding tutor helping learner ${context.user_id}.`,
      `Profile: ${profileDetails.join('; ')}.`,
      `Programming background: ${languagesSummary}.`,
      `Learning goals: ${goals}.`,
      `Strengths: ${strengths}.`,
      `Growth opportunities: ${opportunities}.`,
      `Learning preferences: ${learningPreferences}.`,
      `Last updated ${new Date(context.last_updated).toISOString()} (version ${context.version}).`,
      'Use the following UI context to ground your response:',
      formatUiContext(uiContext),
      'Provide concise, example-driven guidance that references this context when relevant.',
    ].join(' ');
  };

  const refreshSystemPrompt = async (uiContext: UiContextSnapshot) => {
    try {
      const response = await fetch(`${apiBase}/user-context`);
      if (!response.ok) {
        throw new Error(`Failed to load user context (status ${response.status})`);
      }
      const data: UserContext = await response.json();
      const prompt = buildSystemPromptFromContext(data, uiContext);
      setSystemPrompt(prompt);
      return prompt;
    } catch (error) {
      console.error('Unable to load user context for system prompt.', error);
      setSystemPrompt(defaultSystemPrompt);
      return `${defaultSystemPrompt}\n${formatUiContext(uiContext)}`;
    }
  };

  useEffect(() => {
    const uiContext = buildUiContextSnapshot();
    refreshSystemPrompt(uiContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  const appendLine = (line: string) => setTerminalLines((prev) => [...prev.slice(-10), line]);

  const handleRun = async () => {
    if (!exerciseId) {
      appendLine('⚠️ No exercise loaded. Please generate an exercise first.');
      return;
    }

    setIsRunning(true);
    appendLine('▶️ Sending code to backend. Waiting for execution result...');

    try {
      const response = await fetch(`${apiBase}/exercises/${exerciseId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: editorValue, language: 'python' }),
      });

      if (!response.ok) {
        appendLine(`❌ Run failed with status ${response.status}`);
        return;
      }

      const data: { stdout: string; stderr: string; duration_ms: number } = await response.json();
      appendLine(`✅ Execution complete in ${data.duration_ms}ms.`);
      if (data.stdout) appendLine(`stdout:\n${data.stdout}`);
      if (data.stderr) appendLine(`stderr:\n${data.stderr}`);
    } catch (error) {
      appendLine('❌ Error contacting backend for run.');
      console.error(error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleGenerate = async () => {
    setIsLoadingExercise(true);
    appendLine('✨ Requesting a new exercise from the backend...');

    try {
      const response = await fetch(`${apiBase}/exercises/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'strings', difficulty: 'easy', language: 'python' }),
      });

      if (!response.ok) {
        appendLine(`❌ Failed to generate exercise (status ${response.status}).`);
        return;
      }

      const data: {
        id: string;
        title: string;
        difficulty: 'easy' | 'medium' | 'hard';
        prompt_markdown: string;
        starter_code: string;
        language: string;
      } = await response.json();

      setExerciseId(data.id);
      setExerciseTitle(data.title);
      setExerciseDifficulty(data.difficulty);
      setPromptMarkdown(data.prompt_markdown);
      setEditorValue(data.starter_code);

      appendLine(`📥 New exercise loaded: ${data.title} (${data.difficulty}).`);
    } catch (error) {
      appendLine('❌ Error contacting backend for exercise generation.');
      console.error(error);
    } finally {
      setIsLoadingExercise(false);
    }
  };

  const handleResetEditor = () => {
    setEditorValue(starter);
    setExerciseTitle('Count vowels');
    setExerciseDifficulty('easy');
    setExerciseId(null);
    setPromptMarkdown(placeholderMarkdown);
    appendLine('↩️ Editor reset to starter template.');
  };

  const handleSubmit = async () => {
    if (!exerciseId) {
      appendLine('⚠️ No exercise loaded. Please generate an exercise first.');
      return;
    }

    setIsRunning(true);
    appendLine('📤 Submitting solution for evaluation...');

    try {
      const response = await fetch(`${apiBase}/exercises/${exerciseId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: editorValue, language: 'python' }),
      });

      if (!response.ok) {
        appendLine(`❌ Submission failed with status ${response.status}`);
        return;
      }

      const data: {
        status: 'passed' | 'failed';
        score: number;
        stdout: string;
        stderr: string;
        details: { tests_run: number; tests_failed: number };
      } = await response.json();

      const statusEmoji = data.status === 'passed' ? '✅' : '❌';
      appendLine(`${statusEmoji} Submission result: ${data.status.toUpperCase()}`);
      appendLine(`📊 Score: ${(data.score * 100).toFixed(1)}% (${data.details.tests_run - data.details.tests_failed}/${data.details.tests_run} tests passed)`);
      if (data.stdout) appendLine(`stdout:\n${data.stdout}`);
      if (data.stderr) appendLine(`stderr:\n${data.stderr}`);
    } catch (error) {
      appendLine('❌ Error contacting backend for submission.');
      console.error(error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const uiContext = buildUiContextSnapshot();
      const resolvedSystemPrompt = await refreshSystemPrompt(uiContext);

      const conversation_history = chatMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const system_message = {
        role: 'system' as const,
        content: resolvedSystemPrompt || systemPrompt || defaultSystemPrompt,
      };

      const response = await fetch(`${apiBase}/chat/ask/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          exercise_id: exerciseId,
          conversation_history: [system_message, ...conversation_history],
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const data: { response: string } = await response.json();
      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Error communicating with the LLM. Please try again.' }]);
      console.error(error);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="flex h-screen w-full flex-col gap-3 p-3 md:gap-4 md:p-4">
        <header className="flex shrink-0 flex-col gap-1.5 md:gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl font-bold md:text-3xl">Exercise playground</h1>
              <p className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300 sm:block">Learn Code Fast</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 md:gap-2">
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-indigo-200">Backend: {apiBase}</span>
              <span className="hidden rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-200 sm:inline">Monaco</span>
              <span className="hidden rounded-full bg-sky-500/10 px-2 py-0.5 text-sky-200 md:inline">ReactMarkdown</span>
            </div>
          </div>
          
          {/* Generate Exercise button - top of page */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoadingExercise}
              className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingExercise ? '✨ Loading exercise...' : '✨ Generate Exercise'}
            </button>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:gap-4 xl:grid-cols-2 xl:grid-rows-2">
          {/* Top left - Markdown prompt */}
          <div className="flex min-h-0 flex-col rounded-lg border border-slate-800 bg-slate-900/60 p-3 shadow-lg shadow-indigo-900/30 md:p-4 xl:row-span-1">
            <div className="mb-2 flex items-start justify-between gap-2 md:mb-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wider text-slate-400">Prompt</p>
                <h2 className="truncate text-lg font-semibold md:text-xl">{exerciseTitle}</h2>
              </div>
              <span
                className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold capitalize ${exerciseDifficulty === 'easy'
                    ? 'bg-emerald-500/10 text-emerald-200'
                    : exerciseDifficulty === 'medium'
                      ? 'bg-amber-500/10 text-amber-200'
                      : 'bg-rose-500/10 text-rose-200'
                  }`}
              >
                {exerciseDifficulty}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200">
              <ReactMarkdown className="prose prose-invert prose-sm max-w-none prose-pre:bg-slate-900 prose-pre:text-slate-100">
                {promptMarkdown}
              </ReactMarkdown>
            </div>
          </div>

          {/* Top right - Monaco editor with controls */}
          <div className="flex min-h-0 flex-col rounded-lg border border-slate-800 bg-slate-900/60 p-3 shadow-lg shadow-indigo-900/30 md:p-4 xl:row-span-1">
            <div className="mb-2 flex items-center justify-between gap-2 md:mb-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wider text-slate-400">Editor</p>
                <h2 className="truncate text-lg font-semibold md:text-xl">Solution workspace</h2>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-xs text-slate-300">
                <span className="rounded bg-slate-800 px-2 py-0.5">Python</span>
                <span className="hidden rounded bg-slate-800 px-2 py-0.5 sm:inline">Monaco</span>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded border border-slate-800 bg-slate-950/60 mb-2">
              <MonacoEditor
                height="100%"
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
            {/* Editor control buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleRun}
                disabled={isRunning}
                className="rounded border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRunning ? '▶️ Running...' : '▶️ Run in sandbox'}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isRunning}
                className="rounded border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRunning ? '📤 Submitting...' : '📤 Submit solution'}
              </button>
              <button
                type="button"
                onClick={handleResetEditor}
                className="rounded border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-indigo-400 hover:text-indigo-200"
              >
                ↩️ Reset editor
              </button>
            </div>
          </div>

          {/* Bottom left - Chat interface */}
          <div className="flex min-h-0 flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 shadow-lg shadow-indigo-900/30 md:gap-3 md:p-4 xl:row-span-1">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wider text-slate-400">Assistant</p>
                <h2 className="truncate text-lg font-semibold md:text-xl">Ask for help</h2>
              </div>
            </div>

            {/* Chat messages area */}
            <div className="min-h-0 flex-1 overflow-auto rounded border border-slate-800 bg-slate-950/60 p-3 space-y-3">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-slate-400">No messages yet. Start a conversation!</p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xs rounded px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-indigo-600/40 text-indigo-100 border border-indigo-500/40'
                          : 'bg-slate-800/60 text-slate-200 border border-slate-700/40'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/60 text-slate-200 border border-slate-700/40 rounded px-3 py-2 text-sm">
                    <span className="inline-block animate-pulse">Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat input area */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isChatLoading && handleChatSend()}
                placeholder="Ask a question about the exercise..."
                disabled={isChatLoading}
                className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-400 transition focus:border-indigo-400 focus:outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleChatSend}
                disabled={isChatLoading || !chatInput.trim()}
                className="shrink-0 rounded bg-indigo-600/60 px-3 py-2 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </div>

          {/* Bottom right - Terminal */}
          <div className="flex min-h-0 flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 shadow-lg shadow-indigo-900/30 md:gap-3 md:p-4 xl:row-span-1">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wider text-slate-400">Terminal</p>
                <h2 className="truncate text-lg font-semibold md:text-xl">Execution logs</h2>
              </div>
              <button
                type="button"
                onClick={() => setTerminalLines([])}
                className="shrink-0 rounded border border-slate-700 px-2.5 py-0.5 text-xs text-slate-200 transition hover:border-indigo-400 hover:text-indigo-200"
              >
                Clear
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded border border-slate-800 bg-slate-950/60 p-2.5 font-mono text-sm text-slate-200">
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

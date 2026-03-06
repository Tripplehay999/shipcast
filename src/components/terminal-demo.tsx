"use client";

import { useEffect, useState } from "react";

const LINES = [
  { text: "$ what did you ship today?", color: "text-zinc-300", delay: 0, typewriter: true },
  { text: "> Added invoice analytics to the dashboard.", color: "text-emerald-400", delay: 900, typewriter: true },
  { text: "analyzing update...", color: "text-zinc-600", delay: 2400, typewriter: false },
  { text: "generating content...", color: "text-zinc-600", delay: 3000, typewriter: false },
  { text: "  tweet              ✓ ready", color: "text-blue-400", delay: 3600, typewriter: false },
  { text: "  thread (5 tweets)  ✓ ready", color: "text-blue-400", delay: 4000, typewriter: false },
  { text: "  linkedin post      ✓ ready", color: "text-blue-400", delay: 4400, typewriter: false },
  { text: "  reddit discussion  ✓ ready", color: "text-blue-400", delay: 4800, typewriter: false },
  { text: "  indie hackers      ✓ ready", color: "text-blue-400", delay: 5200, typewriter: false },
  { text: "5 posts generated in 2.3s ▋", color: "text-zinc-500", delay: 5700, typewriter: false },
];

const LOOP_RESET = 8500;
const CHAR_SPEED = 25;

function TerminalInner() {
  const [visible, setVisible] = useState<string[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    LINES.forEach((line, i) => {
      if (!line.typewriter) {
        timers.push(
          setTimeout(() => {
            setVisible((prev) => [...prev, line.text]);
          }, line.delay)
        );
      } else {
        line.text.split("").forEach((_, ci) => {
          timers.push(
            setTimeout(() => {
              const partial = line.text.slice(0, ci + 1);
              setVisible((prev) => {
                const next = [...prev];
                next[i] = partial;
                return next;
              });
            }, line.delay + ci * CHAR_SPEED)
          );
        });
      }
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="p-5 font-mono text-sm space-y-2 min-h-[232px]">
      {LINES.map((line, i) =>
        visible[i] !== undefined ? (
          <div key={i} className={line.color}>
            {visible[i]}
          </div>
        ) : null
      )}
    </div>
  );
}

export function TerminalDemo() {
  const [iteration, setIteration] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIteration((n) => n + 1);
    }, LOOP_RESET);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mt-20 rounded-xl border border-zinc-800 bg-zinc-950 text-left max-w-2xl mx-auto overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900">
        <div className="h-3 w-3 rounded-full bg-zinc-700" />
        <div className="h-3 w-3 rounded-full bg-zinc-700" />
        <div className="h-3 w-3 rounded-full bg-zinc-700" />
        <span className="text-xs text-zinc-600 ml-2 font-mono">shipcast — new update</span>
      </div>
      <TerminalInner key={iteration} />
    </div>
  );
}

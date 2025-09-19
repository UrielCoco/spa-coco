// src/components/chat/ChatPanel.tsx
import { useSpaChat } from '@/hooks/useSpaChat';
import { useEffect, useRef } from 'react';

export default function ChatPanel() {
  const { bubbles, input, setInput, send, thinking } = useSpaChat();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [bubbles, thinking]);

  return (
    <div className="h-full flex flex-col">
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-2 p-3 bg-neutral-950 text-neutral-100 rounded">
        {bubbles.map(b => (
          <div
            key={b.id}
            className={`max-w-[80%] rounded-xl px-3 py-2 ${b.role === 'user' ? 'bg-blue-600 ml-auto' : 'bg-neutral-800'}`}
            style={b.hidden ? { opacity: 0.6 } : undefined}
            title={b.hidden ? 'Bloque oculto' : undefined}
          >
            <div className="text-xs opacity-70 mb-1">{b.role}{b.hidden ? ' • oculto' : ''}</div>
            <div className="whitespace-pre-wrap break-words">{b.content}</div>
          </div>
        ))}

        {thinking && (
          <div className="max-w-[70%] rounded-xl px-3 py-2 bg-neutral-800">
            <div className="text-xs opacity-70 mb-1">assistant</div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-neutral-400 animate-bounce" />
              <span className="inline-block w-2 h-2 rounded-full bg-neutral-400 animate-bounce [animation-delay:120ms]" />
              <span className="inline-block w-2 h-2 rounded-full bg-neutral-400 animate-bounce [animation-delay:240ms]" />
              <span className="opacity-70">pensando…</span>
            </div>
          </div>
        )}
      </div>

      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu mensaje…  (⌘/Ctrl + Enter para enviar)"
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-neutral-100 outline-none"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 active:scale-[.98] text-white rounded px-4 py-2"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

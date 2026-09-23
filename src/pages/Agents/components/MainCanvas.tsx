import React, { useState, useRef, useEffect } from 'react';
import { Brain, Loader2 } from 'lucide-react';
import type { AgentProfile, SessionMessage } from '../../../api/agents';

interface MainCanvasProps {
  rightOpen: boolean;
  centerWidth: number;
  agent: AgentProfile | null;
  sessionId: string | null;
  messages: SessionMessage[];
  loading: boolean;
  onSendMessage: (content: string) => Promise<void>;
}

export function MainCanvas({
  rightOpen, centerWidth, agent, sessionId,
  messages, loading, onSendMessage,
}: MainCanvasProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      await onSendMessage(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <main
      className="flex flex-col bg-surface overflow-hidden relative shrink-0 transition-[width] duration-0"
      style={{ width: rightOpen ? `${centerWidth}px` : '100%', flex: rightOpen ? 'none' : '1' }}
    >
      {/* Header */}
      <div className="h-12 border-b border-[#222222] bg-surface-container-lowest flex items-center px-6 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${agent ? 'bg-emerald-500 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]' : 'bg-zinc-600'}`} />
          <span className="text-[12px] font-medium text-on-surface uppercase tracking-widest leading-none">
            {sessionId ? `Session: ${sessionId}` : 'No agent selected'}
          </span>
        </div>
        {agent && (
          <div className="text-[13px] text-zinc-600 hidden sm:flex gap-4">
            <span>{agent.display_name}</span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col gap-6">
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        )}

        {!loading && !agent && (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
            Select an agent from the sidebar to start
          </div>
        )}

        {!loading && agent && messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Brain className="w-12 h-12 text-emerald-500" />
            <h2 className="text-emerald-400 text-lg font-semibold">{agent.display_name}</h2>
            {agent.description && (
              <p className="text-zinc-500 text-sm max-w-md text-center">{agent.description}</p>
            )}
            <p className="text-zinc-600 text-xs mt-2">
              Start a conversation — type a message below
            </p>
          </div>
        )}

        {!loading && messages.length > 0 && (
          <>
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              const isThinking = msg.role === 'system' && msg.content === 'thinking';
              return (
                <div key={i} className={`flex flex-col gap-2 max-w-3xl ${isUser ? 'self-end items-end' : 'self-start items-start'} w-full`}>
                  <div className={`text-[10px] uppercase flex items-center gap-2 font-medium ${isUser ? 'text-zinc-500' : 'text-emerald-500'}`}>
                    {isUser ? 'You' : isThinking ? <><Loader2 className="w-3 h-3 animate-spin" /> Thinking</> : <><Brain className="w-3.5 h-3.5" /> {agent?.display_name ?? 'Agent'}</>}
                  </div>
                  {isThinking ? (
                    <div className="border border-[#222222] p-4 text-zinc-500 text-[14px] leading-[1.6] w-full bg-surface-container-lowest italic">
                      <Loader2 className="w-4 h-4 text-emerald-500 animate-spin inline mr-2" />
                      Waiting for response...
                    </div>
                  ) : (
                    <div className={`border border-[#222222] p-4 text-on-surface text-[14px] leading-[1.6] w-full ${isUser ? 'bg-surface-container' : 'bg-surface-container-lowest'}`}>
                      {msg.content}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      {agent && (
        <div className="p-4 sm:p-6 border-t border-[#222222] bg-surface-container-lowest shrink-0">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            <label className="text-[12px] font-medium text-zinc-500 uppercase tracking-widest flex justify-between">
              <span>&gt; Message {agent.display_name}</span>
              <span className="text-zinc-700 hidden sm:block">Enter to Send</span>
            </label>
            <div className="flex gap-4 items-end">
              <div className="flex-1 border-b border-[#333333] focus-within:border-emerald-500 transition-colors pb-2 relative">
                <textarea
                  className="w-full bg-transparent outline-none text-[13px] text-on-surface placeholder-zinc-700 resize-none overflow-hidden block font-mono"
                  placeholder="Type a message..."
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                />
              </div>
              <button
                className="px-6 py-2 border border-[#333333] hover:border-emerald-500 text-zinc-400 hover:text-emerald-400 text-xs uppercase tracking-wider transition-colors shrink-0 bg-[#0a0a0a] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSend}
                disabled={sending || !input.trim()}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

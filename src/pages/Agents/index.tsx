import React, { useState, useRef, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { SideNavBar } from './components/SideNav';
import { LogConsole } from './components/LogConsole';
import { MainCanvas } from './components/MainCanvas';
import { fetchAgents, fetchSessions, fetchHistory, sendMessage, type AgentProfile, type SessionSummary, type SessionMessage, type SendMessageResult } from '../../api/agents';

export function AgentsPage() {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(true);
  const [centerWidth, setCenterWidth] = useState(600);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    fetchAgents().then(setAgents).catch(() => {});
    fetchSessions().then(setSessions).catch(() => {});
  }, []);

  const handleSelectAgent = useCallback((role: string) => {
    setActiveAgent(role);
    const agent = agents.find(a => a.role === role) ?? null;
    setSelectedAgent(agent);
    if (agent) {
      const sessionId = `global-${agent.role}`;
      setActiveSession(sessionId);
      setLoading(true);
      fetchHistory(sessionId)
        .then(setMessages)
        .catch(() => setMessages([]))
        .finally(() => setLoading(false));
    }
  }, [agents]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!activeSession || !content.trim()) return;
    const sessionId = activeSession;
    const userMsg: SessionMessage = { role: 'user', content };
    // Show thinking indicator until first chunk arrives
    const thinkingMsg: SessionMessage = { role: 'system', content: 'thinking' };
    setMessages(prev => [...prev, userMsg, thinkingMsg]);
    let streamStarted = false;
    try {
      const result = await sendMessage(sessionId, content, undefined, (token) => {
        flushSync(() => {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (!streamStarted) {
              streamStarted = true;
              updated[updated.length - 1] = { role: 'assistant', content: token };
            } else if (last && last.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: last.content + token };
            }
            return updated;
          });
        });
      });
      if (result.type === 'reply' && result.content) {
        // Always replace the last message (thinking or streaming) with final reply
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: result.content };
          return updated;
        });
      } else if (result.type === 'require_action') {
        setMessages(prev => prev.slice(0, -1)); // remove thinking
        const actionMsg: SessionMessage = {
          role: 'system',
          content: `Permission required: allow ${result.tool_name} (${result.capability})? Request ID: ${result.request_id}`,
        };
        setMessages(prev => [...prev, actionMsg]);
      } else if (result.type === 'error') {
        setMessages(prev => prev.slice(0, -1)); // remove thinking
      }
      fetchSessions().then(setSessions).catch(() => {});
    } catch {
      setMessages(prev => prev.slice(0, -1)); // remove thinking
    }
  }, [activeSession]);

  const startDragging = () => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const stopDragging = () => {
    if (isDragging.current) {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  };

  const onDrag = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const leftOffset = leftOpen ? 256 : 64;
    const newWidth = e.clientX - leftOffset;
    const maxCenterWidth = window.innerWidth - leftOffset - 250;

    if (newWidth > 300 && newWidth < maxCenterWidth) {
      setCenterWidth(newWidth);
    } else if (newWidth >= maxCenterWidth) {
      setCenterWidth(maxCenterWidth);
    } else if (newWidth <= 300) {
      setCenterWidth(300);
    }
  }, [leftOpen]);

  useEffect(() => {
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDragging);
    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDragging);
    };
  }, [onDrag]);

  return (
    <div className="agent-workspace w-full h-screen flex flex-row flex-1 min-h-[720px] overflow-hidden selection:bg-primary-container selection:text-on-primary-container">
      <SideNavBar
        isOpen={leftOpen}
        onToggle={() => setLeftOpen(!leftOpen)}
        agents={agents}
        activeAgent={activeAgent}
        onSelectAgent={handleSelectAgent}
        sessions={sessions}
        activeSession={activeSession}
        onSelectSession={setActiveSession}
      />

      {/* Center Canvas */}
      <MainCanvas
        rightOpen={rightOpen}
        centerWidth={centerWidth}
        agent={selectedAgent}
        sessionId={activeSession}
        messages={messages}
        loading={loading}
        onSendMessage={handleSendMessage}
      />

      {/* Resizer */}
      {rightOpen && (
        <div
          className="w-1 cursor-col-resize hover:bg-emerald-500 bg-zinc-800 transition-colors z-50 shrink-0"
          onMouseDown={startDragging}
        />
      )}

      {/* Right SideNavBar */}
      <LogConsole isOpen={rightOpen} />
    </div>
  );
}

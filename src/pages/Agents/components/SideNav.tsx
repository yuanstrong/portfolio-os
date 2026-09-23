import React from 'react';
import { PanelLeftClose, PanelLeft, Plus, Brain, History, Settings, MessageSquare } from 'lucide-react';
import type { AgentProfile, SessionSummary } from '../../../api/agents';

interface SideNavBarProps {
  isOpen: boolean;
  onToggle: () => void;
  agents: AgentProfile[];
  activeAgent: string | null;
  onSelectAgent: (role: string) => void;
  sessions: SessionSummary[];
  activeSession: string | null;
  onSelectSession: (sessionId: string) => void;
}

export function SideNavBar({
  isOpen, onToggle, agents, activeAgent, onSelectAgent,
  sessions, activeSession, onSelectSession,
}: SideNavBarProps) {
  return (
    <aside
      className={`bg-[#0a0a0a] flex flex-col border-r border-zinc-800 z-40 transition-all duration-300 ease-in-out overflow-hidden group/sidebar shrink-0
      ${isOpen ? 'w-64' : 'w-16 sidebar-collapsed'}`}
    >
      <div className="px-4 py-2 flex justify-end">
        <div className="text-[20px] flex-grow font-bold text-emerald-500 sidebar-text truncate whitespace-nowrap">JARVIS</div>
        <button
          className="text-zinc-500 hover:text-emerald-500 transition-colors flex items-center justify-center p-1 cursor-pointer"
          onClick={onToggle}
        >
          {isOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex flex-col gap-1 w-full text-sm">
        <div className="px-4 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider sidebar-text">Agents</div>

        {agents.length === 0 && (
          <a className="py-2 text-zinc-600 pl-4 flex items-center whitespace-nowrap">
            <Brain className="w-[18px] h-[18px] min-w-[18px] mr-3" />
            <span className="sidebar-text">No agents</span>
          </a>
        )}

        {agents.map((agent) => {
          const isActive = activeAgent === agent.role;
          return (
            <a
              key={agent.role}
              onClick={() => onSelectAgent(agent.role)}
              className={`py-2 text-left pl-4 hover:bg-zinc-900/50 hover:text-zinc-200 transition-all duration-75 flex items-center whitespace-nowrap cursor-pointer
                ${isActive ? 'border-l-2 border-emerald-500 text-emerald-400 bg-emerald-950/10 pl-3' : 'text-zinc-500'}`}
              title={agent.description}
            >
              <Brain className="w-[18px] h-[18px] min-w-[18px] mr-3" />
              <span className="sidebar-text">{agent.display_name}</span>
            </a>
          );
        })}

        <div className="px-4 py-1 mt-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider sidebar-text">Sessions</div>

        <a className="py-2 text-zinc-500 pl-4 hover:bg-zinc-900/50 hover:text-zinc-200 transition-all duration-75 flex items-center whitespace-nowrap" href="#">
          <Plus className="w-[18px] h-[18px] min-w-[18px] mr-3" />
          <span className="sidebar-text">New_Session</span>
        </a>

        {sessions.length === 0 && (
          <a className="py-2 text-zinc-600 pl-4 flex items-center whitespace-nowrap">
            <History className="w-[18px] h-[18px] min-w-[18px] mr-3" />
            <span className="sidebar-text">No sessions</span>
          </a>
        )}

        {sessions.map((session) => {
          const isActive = activeSession === session.session_id;
          return (
            <a
              key={session.session_id}
              onClick={() => onSelectSession(session.session_id)}
              className={`py-2 text-left pl-4 hover:bg-zinc-900/50 hover:text-zinc-200 transition-all duration-75 flex items-center whitespace-nowrap cursor-pointer
                ${isActive ? 'border-l-2 border-emerald-500 text-emerald-400 bg-emerald-950/10 pl-3' : 'text-zinc-500'}`}
              title={session.title}
            >
              <MessageSquare className="w-[18px] h-[18px] min-w-[18px] mr-3" />
              <span className="sidebar-text truncate">{session.title || session.session_id}</span>
            </a>
          );
        })}

        <a className="py-2 text-zinc-500 pl-4 hover:bg-zinc-900/50 hover:text-zinc-200 transition-all duration-75 mt-8 border-t border-zinc-800 pt-4 flex items-center whitespace-nowrap" href="#">
          <Settings className="w-[18px] h-[18px] min-w-[18px] mr-3" />
          <span className="sidebar-text">Settings</span>
        </a>
      </nav>
    </aside>
  );
}

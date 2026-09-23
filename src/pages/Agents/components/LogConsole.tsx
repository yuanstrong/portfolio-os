import React from 'react';
import { Download, Trash2 } from 'lucide-react';

interface LogConsoleProps {
  isOpen: boolean;
}

export function LogConsole({ isOpen }: LogConsoleProps) {
  if (!isOpen) return null;

  return (
    <aside className="bg-[#0a0a0a] flex flex-col flex-1 overflow-hidden min-w-[200px]">
      {/* Tabs */}
      <div className="flex border-b border-zinc-800 text-xs uppercase px-4 gap-6 shrink-0 pt-2 pb-0 overflow-x-auto no-scrollbar">
        <a className="pb-3 text-emerald-400 border-b border-emerald-500 font-bold transition-all whitespace-nowrap" href="#">Execution_Logs</a>
        <a className="pb-3 text-zinc-600 hover:text-emerald-300 transition-all font-medium whitespace-nowrap" href="#">Output_JSON</a>
        <a className="pb-3 text-zinc-600 hover:text-emerald-300 transition-all font-medium whitespace-nowrap" href="#">Trace_Metrics</a>
      </div>
      
      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 text-[11px] text-zinc-400 leading-relaxed bg-[#0a0a0a]">
        <div className="flex flex-col gap-1 font-mono break-all">
          <span className="text-zinc-600">[10:41:59.001] SYSTEM_BOOT Sequence initiated...</span>
          <span className="text-zinc-600">[10:41:59.045] Allocating memory segments [OK]</span>
          <span className="text-zinc-500">[10:42:00.112] Connecting to neural cluster...</span>
          <span className="text-emerald-500">[10:42:00.300] CONNECTION ESTABLISHED. Ping: 4ms</span>
          <span className="text-zinc-500">[10:42:05.000] Received user intent [Length: 142b]</span>
          <span className="text-zinc-400">[10:42:05.010] Compiling heuristic search tree...</span>
          <span className="text-orange-400">[10:42:08.550] WARN: Deprecated protocol detected in auth.gateway.eu</span>
          <span className="text-red-400">[10:42:11.200] CRIT: Anomaly signature 'Alpha-9' match found.</span>
          <span className="text-zinc-500">[10:42:12.005] Generating JSON payload...</span>
          <span className="text-emerald-500">[10:42:12.050] Task complete. Idle.</span>
        </div>
      </div>
      
      {/* Footer Actions */}
      <div className="p-3 border-t border-zinc-800 flex gap-2 sm:gap-4 shrink-0 text-xs uppercase bg-[#0a0a0a]">
        <button className="flex items-center text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer">
          <Download className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Export</span>
        </button>
        <button className="flex items-center text-zinc-500 hover:text-red-400 transition-colors ml-auto cursor-pointer">
          <Trash2 className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Clear</span>
        </button>
      </div>
    </aside>
  );
}

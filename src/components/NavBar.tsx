import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthModal } from './AuthModal';
import { useAuthSession } from '../hooks/useAuthSession';

type WorkerStatusResponse = {
  online: boolean;
};

export function NavBar() {
  const location = useLocation();
  const workerOnline = useWorkerStatus();
  const [authOpen, setAuthOpen] = useState(false);
  const { authenticated, signIn } = useAuthSession();

  const baseLinkClasses = "font-mono uppercase tracking-tighter text-sm transition-colors duration-75 hover:text-neutral-100 hover:underline underline-offset-4 decoration-emerald-500";
  const activeClasses = "text-emerald-500 before:content-['>'] before:mr-1";
  const inactiveClasses = "text-neutral-500";

  const openAgentEntry = () => {
    if (!workerOnline) {
      return;
    }
    if (authenticated) {
      window.location.assign('/agents');
      return;
    }
    setAuthOpen(true);
  };

  const completeAuthentication = (token: string) => {
    signIn(token);
    window.location.assign('/agents');
  };

  return (
    <>
      <nav className="bg-neutral-950 w-full top-0 z-50 border-b border-neutral-900 flex justify-between items-center px-10 py-8 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-mono font-bold text-neutral-100 text-lg">PORTFOLIO_OS</Link>
          <button
            type="button"
            aria-label={workerOnline ? 'Open Jarvis agent authentication' : 'Jarvis worker offline'}
            className={`h-2.5 w-2.5 rounded-full border p-0 transition-shadow ${workerOnline ? 'cursor-pointer border-emerald-300 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.75)] hover:shadow-[0_0_14px_rgba(16,185,129,0.95)]' : 'cursor-default border-neutral-700 bg-neutral-600'}`}
            title={workerOnline ? 'Jarvis worker online' : 'Jarvis worker offline'}
            disabled={!workerOnline}
            onClick={openAgentEntry}
          />
        </div>
        <div className="hidden md:flex gap-8 items-center">
          <Link to="/thoughts" className={`${baseLinkClasses} ${location.pathname === '/thoughts' ? activeClasses : inactiveClasses}`}>THOUGHTS</Link>
          <Link to="/projects" className={`${baseLinkClasses} ${location.pathname === '/projects' ? activeClasses : inactiveClasses}`}>PROJECTS</Link>
          <Link to="/experience" className={`${baseLinkClasses} ${location.pathname === '/experience' ? activeClasses : inactiveClasses}`}>EXPERIENCE</Link>
        </div>
      </nav>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthenticated={completeAuthentication} />
    </>
  );
}

function useWorkerStatus() {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const response = await fetch('/api/v1/stream/workers/status', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`worker status failed: ${response.status}`);
        }
        const status = (await response.json()) as WorkerStatusResponse;
        if (!cancelled) {
          setOnline(status.online);
        }
      } catch {
        if (!cancelled) {
          setOnline(false);
        }
      }
    };

    refresh();
    const interval = window.setInterval(refresh, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return online;
}

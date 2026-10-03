import { Github, Linkedin, Twitter } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-neutral-950 w-full bottom-0 border-t border-neutral-900 flex flex-col md:flex-row justify-between items-center px-10 py-12 gap-4 max-w-screen-2xl mx-auto mt-auto">
      <span className="font-mono text-xs uppercase tracking-widest text-neutral-600 transition-opacity duration-200">© 2024 SYSTEM_ARCHITECT</span>
      <div className="flex gap-6">
        <a className="font-mono text-xs uppercase tracking-widest text-neutral-600 hover:text-emerald-500 transition-opacity duration-200 flex items-center gap-2" href="https://github.com/yuanstrong" target="_blank" rel="noopener noreferrer">
          <Github className="h-4 w-4" />
          GITHUB
        </a>
        <a className="font-mono text-xs uppercase tracking-widest text-neutral-600 hover:text-emerald-500 transition-opacity duration-200 flex items-center gap-2" href="https://www.linkedin.com/in/shiming-yuan-0428522b" target="_blank" rel="noopener noreferrer">
          <Linkedin className="h-4 w-4" />
          LINKEDIN
        </a>
        <a className="font-mono text-xs uppercase tracking-widest text-neutral-600 hover:text-emerald-500 transition-opacity duration-200 flex items-center gap-2" href="https://x.com/StrongSM" target="_blank" rel="noopener noreferrer">
          <Twitter className="h-4 w-4" />
          TWITTER
        </a>
      </div>
    </footer>
  );
}

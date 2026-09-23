export function Footer() {
  return (
    <footer className="bg-neutral-950 w-full bottom-0 border-t border-neutral-900 flex flex-col md:flex-row justify-between items-center px-10 py-12 gap-4 max-w-screen-2xl mx-auto mt-auto">
      <span className="font-mono text-xs uppercase tracking-widest text-neutral-600 transition-opacity duration-200">© 2024 SYSTEM_ARCHITECT</span>
      <div className="flex gap-6">
        <a className="font-mono text-xs uppercase tracking-widest text-neutral-600 hover:text-emerald-500 transition-opacity duration-200" href="#">GITHUB</a>
        <a className="font-mono text-xs uppercase tracking-widest text-neutral-600 hover:text-emerald-500 transition-opacity duration-200" href="#">LINKEDIN</a>
        <a className="font-mono text-xs uppercase tracking-widest text-neutral-600 hover:text-emerald-500 transition-opacity duration-200" href="#">TWITTER</a>
      </div>
    </footer>
  );
}

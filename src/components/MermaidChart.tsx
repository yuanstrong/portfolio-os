import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
}

export const MermaidChart: React.FC<MermaidProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'IBM Plex Mono, monospace',
    });

    if (ref.current) {
      // Clear previous content
      ref.current.innerHTML = '';
      const id = 'mermaid-svg-' + Math.random().toString(36).substring(7);
      
      mermaid.render(id, chart).then(({ svg }) => {
        if (ref.current) {
          ref.current.innerHTML = svg;
        }
      }).catch(err => {
        console.error("Mermaid parsing error:", err);
      });
    }
  }, [chart]);

  return <div className="mermaid flex justify-center my-8 overflow-x-auto w-full" ref={ref} />;
};

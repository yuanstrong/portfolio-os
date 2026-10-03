import { useParams, Link } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { fetchThought, fetchThoughts, formatResourceDate, type ThoughtSummary } from '../api/resources';
import { MermaidChart } from '../components/MermaidChart';
import { ResourceLoading } from '../components/ResourceFeedback';
import { useAsyncResource } from '../hooks/useAsyncResource';

type ThoughtPost = {
  body: string;
  summary: ThoughtSummary | null;
};

export function BlogPost() {
  const { id } = useParams<{ id: string }>();
  const thoughtId = id ? safelyDecodeURIComponent(id) : undefined;
  const post = useAsyncResource<ThoughtPost>(async () => {
    if (!thoughtId) {
      throw new Error('missing thought id');
    }

    const [thoughts, body] = await Promise.all([
      fetchThoughts().catch(() => []),
      fetchThought(thoughtId),
    ]);

    return {
      body,
      summary: thoughts.find((thought) => thought.id === thoughtId) ?? null,
    };
  }, [id]);

  if (post.status === 'loading') {
    return (
      <main className="flex-grow w-full max-w-4xl mx-auto px-container-padding py-section-gap flex flex-col gap-[96px]">
        <Link to="/thoughts" className="font-mono text-xs uppercase tracking-widest text-neutral-500 hover:text-emerald-500 transition-colors block w-fit">
          <span className="mr-2">&lt;</span> BACK_TO_THOUGHTS
        </Link>
        <ResourceLoading message="loading_thought" />
      </main>
    );
  }

  if (post.status === 'error') {
    return (
      <main className="flex-grow w-full max-w-4xl mx-auto px-container-padding py-section-gap flex flex-col gap-[96px] justify-center items-center">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">404_NOT_FOUND</h1>
        <p className="font-body-md text-on-surface-variant">The thought you are looking for has been purged or never existed.</p>
        <Link to="/thoughts" className="text-primary hover:underline font-mono uppercase text-sm mt-4 tracking-widest decoration-emerald-500 underline-offset-4">
          Return_to_thoughts
        </Link>
      </main>
    );
  }

  const title = post.data.summary?.title || thoughtId || 'thought';
  const date = post.data.summary ? formatResourceDate(post.data.summary.date) : '';
  const tags = post.data.summary?.tags ?? [];
  const categories = post.data.summary?.categories ?? [];
  const language = post.data.summary?.lang ?? '';
  const bodyClassName = getThoughtBodyClassName(language);

  return (
    <main className="flex-grow w-full max-w-4xl mx-auto px-container-padding py-section-gap flex flex-col">
      <Link to="/thoughts" className="font-mono text-xs uppercase tracking-widest text-neutral-500 hover:text-emerald-500 transition-colors mb-12 block w-fit">
        <span className="mr-2">&lt;</span> BACK_TO_THOUGHTS
      </Link>
      
      <article className="flex flex-col w-full">
        <header className="border-b border-[#222222] pb-10 mb-10 flex flex-col gap-4">
          <h1 className="font-headline-lg text-4xl text-on-surface font-bold leading-tight">{title}</h1>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {date && <span className="font-code text-code text-on-surface-variant">{date}</span>}
            {(categories.length > 0 || tags.length > 0) && (
              <div className="font-code text-xs flex flex-wrap gap-3">
                {categories.map(category => (
                  <span key={category} className="text-emerald-500">[{category}]</span>
                ))}
                {tags.map(tag => (
                  <span key={tag} className="text-neutral-500">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className={`${bodyClassName} flex flex-col w-full gap-2`} lang={language || undefined}>
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              code(props: any) {
                const { children, className, node, inline, ...rest } = props;
                const match = /language-(\w+)/.exec(className || '');
                
                if (match && match[1] === 'mermaid') {
                  return <MermaidChart chart={String(children).replace(/\n$/, '')} />;
                }
                
                return !inline && match ? (
                  <div className="my-6 w-full text-sm">
                    <SyntaxHighlighter
                      {...rest}
                      PreTag="div"
                      children={String(children).replace(/\n$/, '')}
                      language={match[1]}
                      style={vscDarkPlus}
                      customStyle={{ 
                        background: '#0a0a0a', 
                        border: '1px solid #1a1a1a', 
                        borderRadius: '0', 
                        padding: '1.5rem', 
                        margin: 0, 
                        fontFamily: "'IBM Plex Mono', monospace" 
                      }}
                    />
                  </div>
                ) : (
                  <code {...rest} className="bg-neutral-900 border border-neutral-800 text-emerald-400 px-1.5 py-0.5 font-mono text-[0.9em]">
                    {children}
                  </code>
                );
              },
              h1: ({node, ...props}) => <h1 className="font-headline-lg text-3xl font-bold text-on-surface mt-16 mb-8 border-b border-[#222222] pb-4" {...props} />,
              h2: ({node, ...props}) => <h2 className="font-headline-md text-2xl font-bold text-on-surface mt-14 mb-6 border-b border-[#222222] pb-2 inline-block w-full" {...props} />,
              h3: ({node, ...props}) => <h3 className="font-headline-md text-xl font-bold text-on-surface mt-8 mb-4" {...props} />,
              p: ({node, ...props}) => <p className="font-body-md text-on-surface-variant leading-loose mb-6" {...props} />,
              a: ({node, ...props}) => <a className="text-primary hover:text-emerald-400 hover:underline underline-offset-4 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 mb-8 mt-2 space-y-3 text-on-surface-variant font-body-md leading-relaxed marker:text-emerald-500" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-6 mb-8 mt-2 space-y-3 text-on-surface-variant font-body-md leading-relaxed marker:text-emerald-500" {...props} />,
              li: ({node, ...props}) => <li className="" {...props} />,
              strong: ({node, ...props}) => <strong className="font-bold text-on-surface" {...props} />,
              em: ({node, ...props}) => <em className="italic text-neutral-300" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-emerald-500 bg-[#0c0c0c] pl-6 py-4 pr-4 my-8 text-neutral-400 font-body-md leading-relaxed italic" {...props} />
            }}
          >
            {post.data.body}
          </Markdown>
        </div>
      </article>
    </main>
  );
}

export function getThoughtBodyClassName(language: string): string {
  if (/^zh(?:-|$)/i.test(language)) {
    return 'thought-body thought-body--zh';
  }
  if (/^en(?:-|$)/i.test(language)) {
    return 'thought-body thought-body--en';
  }
  return 'thought-body';
}

function safelyDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

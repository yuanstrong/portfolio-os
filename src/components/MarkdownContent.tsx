import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MermaidChart } from './MermaidChart';

type MarkdownContentProps = {
  body: string;
  projectId?: string;
  documentPath?: string;
};

export function MarkdownContent({ body, projectId, documentPath = 'README.md' }: MarkdownContentProps) {
  return (
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
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              />
            </div>
          ) : (
            <code {...rest} className="bg-neutral-900 border border-neutral-800 text-emerald-400 px-1.5 py-0.5 font-mono text-[0.9em]">
              {children}
            </code>
          );
        },
        h1: ({ node, ...props }: any) => <h1 className="font-headline-lg text-3xl font-bold text-on-surface mt-16 mb-8 border-b border-[#222222] pb-4" {...props} />,
        h2: ({ node, ...props }: any) => <h2 className="font-headline-md text-2xl font-bold text-on-surface mt-14 mb-6 border-b border-[#222222] pb-2 inline-block w-full" {...props} />,
        h3: ({ node, ...props }: any) => <h3 className="font-headline-md text-xl font-bold text-on-surface mt-8 mb-4" {...props} />,
        p: ({ node, ...props }: any) => <p className="font-body-md text-on-surface-variant leading-loose mb-6" {...props} />,
        a: ({ node, href, children, ...props }: any) => {
          const reference = resolveProjectReference(documentPath, href);
          if (projectId && reference && isMarkdownPath(reference.path)) {
            return (
              <Link
                to={`/projects/${encodeURIComponent(projectId)}/${encodeURIComponent(stripMarkdownExtension(reference.path))}${reference.suffix}`}
                className="text-primary hover:text-emerald-400 hover:underline underline-offset-4 transition-colors"
                {...props}
              >
                {children}
              </Link>
            );
          }

          const assetPath = projectId && reference?.path
            ? projectAssetUrl(projectId, reference.path)
            : href;
          const isAnchor = href?.startsWith('#');
          return (
            <a
              href={`${assetPath ?? ''}${reference?.suffix ?? ''}`}
              className="text-primary hover:text-emerald-400 hover:underline underline-offset-4 transition-colors"
              target={reference || isAnchor ? undefined : '_blank'}
              rel={reference || isAnchor ? undefined : 'noopener noreferrer'}
              {...props}
            >
              {children}
            </a>
          );
        },
        img: ({ node, src, alt, ...props }: any) => {
          const reference = resolveProjectReference(documentPath, src);
          const imageSrc = projectId && reference
            ? projectAssetUrl(projectId, reference.path) + reference.suffix
            : src;
          return <img src={imageSrc} alt={alt ?? ''} className="max-w-full h-auto mx-auto my-8" {...props} />;
        },
        ul: ({ node, ...props }: any) => <ul className="list-disc list-outside ml-6 mb-8 mt-2 space-y-3 text-on-surface-variant font-body-md leading-relaxed marker:text-emerald-500" {...props} />,
        ol: ({ node, ...props }: any) => <ol className="list-decimal list-outside ml-6 mb-8 mt-2 space-y-3 text-on-surface-variant font-body-md leading-relaxed marker:text-emerald-500" {...props} />,
        li: ({ node, ...props }: any) => <li {...props} />,
        strong: ({ node, ...props }: any) => <strong className="font-bold text-on-surface" {...props} />,
        em: ({ node, ...props }: any) => <em className="italic text-neutral-300" {...props} />,
        blockquote: ({ node, ...props }: any) => <blockquote className="border-l-2 border-emerald-500 bg-[#0c0c0c] pl-6 py-4 pr-4 my-8 text-neutral-400 font-body-md leading-relaxed italic" {...props} />,
      }}
    >
      {body}
    </Markdown>
  );
}

function resolveProjectReference(currentPath: string, href: string | undefined) {
  if (!href || /^(?:[a-z]+:|\/\/|#)/i.test(href)) {
    return null;
  }

  const suffixIndex = href.search(/[?#]/);
  const rawPath = suffixIndex === -1 ? href : href.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? '' : href.slice(suffixIndex);
  const parts = [...currentPath.split('/').slice(0, -1), ...rawPath.split('/')];
  const normalized: string[] = [];

  for (const part of parts) {
    if (!part || part === '.') {
      continue;
    }
    if (part === '..') {
      normalized.pop();
      continue;
    }
    normalized.push(part);
  }

  return { path: normalized.join('/'), suffix };
}

function projectAssetUrl(projectId: string, relativePath: string) {
  const encodedPath = relativePath.split('/').map((part) => encodeURIComponent(part)).join('/');
  return `/api/v1/resources/projects/${encodeURIComponent(projectId)}/files/${encodedPath}`;
}

function isMarkdownPath(relativePath: string) {
  return /\.(?:md|markdown)$/i.test(relativePath);
}

function stripMarkdownExtension(path: string) {
  return path.replace(/\.(md|markdown)$/i, '');
}

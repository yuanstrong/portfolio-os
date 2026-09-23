import { Link } from 'react-router-dom';
import { fetchThoughts, formatResourceDate } from '../api/resources';
import { ResourceEmpty, ResourceError, ResourceLoading } from '../components/ResourceFeedback';
import { useAsyncResource } from '../hooks/useAsyncResource';

export function Thoughts() {
  const thoughts = useAsyncResource(fetchThoughts, []);

  return (
    <main className="flex-grow w-full max-w-4xl mx-auto px-container-padding py-section-gap flex flex-col gap-[96px]">
      <section className="flex flex-col gap-unit">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">/thoughts</h1>
        <p className="font-headline-md text-headline-md text-on-surface-variant max-w-2xl mt-4">
          Musings on deep technical architecture, minimal interfaces, and system resilience. Constantly learning.
        </p>
      </section>

      <section className="flex flex-col gap-element-gap">
        <div className="flex flex-col gap-8 mt-2">
          {thoughts.status === 'loading' && <ResourceLoading message="loading_thoughts" />}
          {thoughts.status === 'error' && <ResourceError message="Unable to load thoughts from the local portfolio home." />}
          {thoughts.status === 'ready' && thoughts.data.length === 0 && (
            <ResourceEmpty message="No thoughts have been published yet." />
          )}
          {thoughts.status === 'ready' && thoughts.data.map((thought) => (
            <article key={thought.id} className="flex flex-col gap-3 border-b border-[#222222] pb-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 group cursor-pointer">
                <Link to={`/thoughts/${encodeURIComponent(thought.id)}`} className="font-headline-md text-[24px] font-bold text-on-surface group-hover:text-primary group-hover:underline decoration-primary underline-offset-4 transition-colors">
                  {thought.title || thought.id}
                </Link>
                <span className="font-code text-code text-on-surface-variant whitespace-nowrap sm:mt-0 mt-1">{formatResourceDate(thought.date)}</span>
              </div>
              {thought.brief && (
                <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
                  {thought.brief}
                </p>
              )}
              {(thought.categories.length > 0 || thought.tags.length > 0) && (
                <div className="font-code text-code mt-2 flex flex-wrap gap-3">
                  {thought.categories.map((category) => (
                    <span key={category} className="text-emerald-500">[{category}]</span>
                  ))}
                  {thought.tags.map((tag) => (
                    <span key={tag} className="text-neutral-500">#{tag}</span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

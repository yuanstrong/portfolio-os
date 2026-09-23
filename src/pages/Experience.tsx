import { fetchExperiences } from '../api/resources';
import { ResourceEmpty, ResourceError, ResourceLoading } from '../components/ResourceFeedback';
import { useAsyncResource } from '../hooks/useAsyncResource';

export function Experience() {
  const experiences = useAsyncResource(fetchExperiences, []);

  return (
    <main className="flex-grow w-full max-w-4xl mx-auto px-container-padding py-section-gap flex flex-col gap-[96px]">
      <section className="flex flex-col gap-unit">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">/experience</h1>
        <p className="font-headline-md text-headline-md text-on-surface-variant max-w-2xl mt-4">
          A timeline of professional roles and personal milestones.
        </p>
      </section>

      <section className="flex flex-col gap-element-gap">
        <h2 className="font-headline-md text-headline-md text-on-surface border-b border-[#222222] pb-2">/work_history</h2>
        <div className="flex flex-col gap-10 mt-6">
          {experiences.status === 'loading' && <ResourceLoading message="loading_experience" />}
          {experiences.status === 'error' && <ResourceError message="Unable to load experience from the local portfolio home." />}
          {experiences.status === 'ready' && experiences.data.workHistory.length === 0 && (
            <ResourceEmpty message="No experience entries have been published yet." />
          )}
          {experiences.status === 'ready' && experiences.data.workHistory.map((entry) => (
            <div key={`${entry.role}-${entry.company}-${entry.period}`} className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline border-b border-[#222222] pb-2 gap-1">
                <h3 className="font-headline-md text-[20px] font-bold text-on-surface">
                  {entry.role}
                  {entry.company && <span className="text-primary"> @ {entry.company}</span>}
                </h3>
                <span className="font-code text-code text-on-surface-variant whitespace-nowrap">{entry.period}</span>
              </div>
              {entry.highlights.length > 0 && (
                <ul className="list-disc list-inside font-body-md text-body-md text-on-surface-variant flex flex-col gap-2">
                  {entry.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-element-gap">
        <h2 className="font-headline-md text-headline-md text-on-surface border-b border-[#222222] pb-2">/milestones</h2>
        <div className="flex flex-col gap-6 mt-6">
          {experiences.status === 'loading' && <ResourceLoading message="loading_milestones" />}
          {experiences.status === 'error' && <ResourceError message="Unable to load milestones from the local portfolio home." />}
          {experiences.status === 'ready' && experiences.data.milestones.length === 0 && (
            <ResourceEmpty message="No milestones have been published yet." />
          )}
          {experiences.status === 'ready' && experiences.data.milestones.map((milestone) => (
            <div key={`${milestone.year}-${milestone.brief}`} className="flex flex-col sm:flex-row sm:gap-4 gap-1">
              <span className="font-code text-code text-primary sm:w-20">{milestone.year}</span>
              <p className="font-body-md text-body-md text-on-surface-variant flex-1">{milestone.brief}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

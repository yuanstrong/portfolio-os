import { Link } from 'react-router-dom';
import {
  fetchExperiences,
  fetchProjects,
  fetchThoughts,
  formatResourceDate,
} from '../api/resources';
import { ResourceEmpty, ResourceError, ResourceLoading } from '../components/ResourceFeedback';
import { useAsyncResource } from '../hooks/useAsyncResource';

export function Home() {
  const thoughts = useAsyncResource(fetchThoughts, []);
  const projects = useAsyncResource(fetchProjects, []);
  const experiences = useAsyncResource(fetchExperiences, []);
  const recentThoughts =
    thoughts.status === 'ready'
      ? [...thoughts.data].sort((left, right) => right.date - left.date).slice(0, 3)
      : [];

  return (
    <main className="flex-grow w-full max-w-4xl mx-auto px-container-padding py-section-gap flex flex-col gap-[96px]">
      {/* Hero Section */}
      <section className="flex flex-col gap-unit">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Shiming Yuan</h1>
        <p className="font-headline-md text-headline-md text-on-surface-variant max-w-2xl mt-4">
          Curiosity-driven by nature, builder by choice. Driven by elegant architecture, low-level efficiency, and a keen eye for aesthetic precision.
        </p>
      </section>

      {/* Thoughts Section */}
      <section className="flex flex-col gap-element-gap">
        <h2 className="font-headline-md text-headline-md text-on-surface border-b border-[#222222] pb-2">/thoughts</h2>
        <div className="flex flex-col gap-4 mt-6">
          {thoughts.status === 'loading' && <ResourceLoading message="loading_thoughts" />}
          {thoughts.status === 'error' && <ResourceError message="Unable to load thoughts from the local portfolio home." />}
          {thoughts.status === 'ready' && recentThoughts.length === 0 && (
            <ResourceEmpty message="No thoughts have been published yet." />
          )}
          {recentThoughts.map((thought) => (
            <div key={thought.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 group cursor-pointer">
              <Link to={`/thoughts/${encodeURIComponent(thought.id)}`} className="font-body-md text-body-md text-on-surface group-hover:text-primary transition-colors underline-offset-4 group-hover:underline">
                {thought.title || thought.id}
              </Link>
              <span className="font-code text-code text-on-surface-variant whitespace-nowrap">{formatResourceDate(thought.date)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Projects Section */}
      <section className="flex flex-col gap-element-gap">
        <h2 className="font-headline-md text-headline-md text-on-surface border-b border-[#222222] pb-2">/projects</h2>
        <div className="flex flex-col gap-8 mt-6">
          {projects.status === 'loading' && <ResourceLoading message="loading_projects" />}
          {projects.status === 'error' && <ResourceError message="Unable to load projects from the local portfolio home." />}
          {projects.status === 'ready' && projects.data.length === 0 && (
            <ResourceEmpty message="No projects have been published yet." />
          )}
          {projects.status === 'ready' && projects.data.slice(0, 3).map((project) => (
            <article key={project.project_id} className="flex flex-col gap-2">
              <h3 className="font-body-md text-body-md font-bold text-primary decoration-primary underline-offset-4 w-fit">
                {project.project_name || project.project_id}
              </h3>
              {project.brief && (
                <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">{project.brief}</p>
              )}
              {project.start_date && (
                <span className="font-code text-code text-on-surface-variant mt-1">{project.start_date}</span>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Experience Section */}
      <section className="flex flex-col gap-element-gap">
        <h2 className="font-headline-md text-headline-md text-on-surface border-b border-[#222222] pb-2">/experience</h2>
        <div className="flex flex-col gap-6 mt-6">
          {experiences.status === 'loading' && <ResourceLoading message="loading_experience" />}
          {experiences.status === 'error' && <ResourceError message="Unable to load experience from the local portfolio home." />}
          {experiences.status === 'ready' && experiences.data.workHistory.length === 0 && (
            <ResourceEmpty message="No experience entries have been published yet." />
          )}
          {experiences.status === 'ready' && experiences.data.workHistory.slice(0, 3).map((entry) => (
            <div key={`${entry.role}-${entry.company}-${entry.period}`} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
              <div>
                <span className="font-body-md text-body-md font-bold text-on-surface">{entry.role}</span>
                {entry.company && (
                  <span className="font-body-md text-body-md text-on-surface-variant"> @ {entry.company}</span>
                )}
              </div>
              <span className="font-code text-code text-on-surface-variant">{entry.period}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

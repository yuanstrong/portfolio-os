import { Link } from 'react-router-dom';
import { fetchProjects } from '../api/resources';
import { ResourceEmpty, ResourceError, ResourceLoading } from '../components/ResourceFeedback';
import { useAsyncResource } from '../hooks/useAsyncResource';

export function Projects() {
  const projects = useAsyncResource('projects', fetchProjects, []);

  return (
    <main className="flex-grow w-full max-w-4xl mx-auto px-container-padding py-section-gap flex flex-col gap-[96px]">
      <section className="flex flex-col gap-unit">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">/projects</h1>
        <p className="font-headline-md text-headline-md text-on-surface-variant max-w-2xl mt-4">
          A collection of tools, libraries, and distributed systems I've built over the years.
        </p>
      </section>

      <section className="flex flex-col gap-element-gap">
        <div className="flex flex-col gap-8 mt-2">
          {projects.status === 'loading' && <ResourceLoading message="loading_projects" />}
          {projects.status === 'error' && <ResourceError message="Unable to load projects from the local portfolio home." />}
          {projects.status === 'ready' && projects.data.length === 0 && (
            <ResourceEmpty message="No projects have been published yet." />
          )}
          {projects.status === 'ready' && projects.data.map((project) => (
            <article key={project.project_id} className="flex flex-col gap-3 border-b border-[#222222] pb-8">
              <Link to={`/projects/${encodeURIComponent(project.project_id)}`} className="font-headline-md text-[24px] font-bold text-primary decoration-primary underline-offset-4 w-fit hover:underline">
                {project.project_name || project.project_id}
              </Link>
              {project.brief && (
                <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">{project.brief}</p>
              )}
              {project.start_date && (
                <span className="font-code text-code text-on-surface-variant mt-1">{project.start_date}</span>
              )}
              {((project.categories ?? []).length > 0 || (project.tags ?? []).length > 0) && (
                <div className="font-code text-code mt-2 flex flex-wrap gap-3">
                  {(project.categories ?? []).map((category) => (
                    <span key={category} className="text-emerald-500">[{category}]</span>
                  ))}
                  {(project.tags ?? []).map((tag) => (
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

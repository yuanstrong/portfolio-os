import { Link, useParams, useSearchParams } from 'react-router-dom';
import { fetchProject, type ProjectDetails } from '../api/resources';
import { MarkdownContent } from '../components/MarkdownContent';
import { ResourceError, ResourceLoading } from '../components/ResourceFeedback';
import { useAsyncResource } from '../hooks/useAsyncResource';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const projectId = id ? safelyDecodeURIComponent(id) : undefined;
  const documentPath = searchParams.get('doc');
  const project = useAsyncResource<ProjectDetails>(
    `project:${projectId ?? ''}`,
    async () => {
      if (!projectId) {
        throw new Error('missing project id');
      }
      return fetchProject(projectId);
    },
    [id],
  );

  if (project.status === 'loading') {
    return (
      <main className="flex-grow w-full max-w-4xl mx-auto px-container-padding py-section-gap">
        <Link to="/projects" className="font-mono text-xs uppercase tracking-widest text-neutral-500 hover:text-emerald-500 transition-colors block w-fit mb-12">
          <span className="mr-2">&lt;</span> BACK_TO_PROJECTS
        </Link>
        <ResourceLoading message="loading_project" />
      </main>
    );
  }

  if (project.status === 'error') {
    return (
      <main className="flex-grow w-full max-w-4xl mx-auto px-container-padding py-section-gap flex flex-col gap-6 justify-center items-center">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">404_NOT_FOUND</h1>
        <p className="font-body-md text-on-surface-variant">The project you are looking for is not published.</p>
        <Link to="/projects" className="text-primary hover:underline font-mono uppercase text-sm tracking-widest decoration-emerald-500 underline-offset-4">
          Return_to_projects
        </Link>
      </main>
    );
  }

  const selectedDocument = documentPath
    ? project.data.documents.find((document) => document.path === documentPath)
    : undefined;
  const title = selectedDocument?.title || project.data.project_name || project.data.project_id;
  const tags = selectedDocument?.tags ?? project.data.tags;
  const categories = selectedDocument?.categories ?? project.data.categories;

  return (
    <main className="flex-grow w-full max-w-4xl mx-auto px-container-padding py-section-gap flex flex-col">
      <Link to="/projects" className="font-mono text-xs uppercase tracking-widest text-neutral-500 hover:text-emerald-500 transition-colors mb-12 block w-fit">
        <span className="mr-2">&lt;</span> BACK_TO_PROJECTS
      </Link>

      <article className="flex flex-col w-full">
        <header className="border-b border-[#222222] pb-10 mb-10 flex flex-col gap-4">
          <h1 className="font-headline-lg text-4xl text-on-surface font-bold leading-tight">{title}</h1>
          {!selectedDocument && project.data.brief && (
            <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">{project.data.brief}</p>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {(project.data.start_date || project.data.end_date) && (
              <span className="font-code text-code text-on-surface-variant">
                {project.data.start_date}{project.data.end_date ? ` - ${project.data.end_date}` : ''}
              </span>
            )}
            {(categories.length > 0 || tags.length > 0) && (
              <div className="font-code text-xs flex flex-wrap gap-3">
                {categories.map((category) => <span key={category} className="text-emerald-500">[{category}]</span>)}
                {tags.map((tag) => <span key={tag} className="text-neutral-500">#{tag}</span>)}
              </div>
            )}
          </div>
        </header>

        {project.data.documents.length > 0 && (
          <nav className="border border-[#222222] bg-[#0c0c0c] p-5 mb-10" aria-label="Project documents">
            <span className="font-code text-xs uppercase tracking-widest text-neutral-500 block mb-3">DOCUMENTS</span>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Link to={`/projects/${encodeURIComponent(project.data.project_id)}`} className="font-code text-sm text-primary hover:underline underline-offset-4">
                README.md
              </Link>
              {project.data.documents.map((document) => (
                <Link
                  key={document.path}
                  to={`/projects/${encodeURIComponent(project.data.project_id)}?doc=${encodeURIComponent(document.path)}`}
                  className="font-code text-sm text-primary hover:underline underline-offset-4"
                >
                  {document.path}
                </Link>
              ))}
            </div>
          </nav>
        )}

        <div className="flex flex-col w-full gap-2">
          <MarkdownContent
            body={selectedDocument?.body ?? project.data.body}
            projectId={project.data.project_id}
            documentPath={selectedDocument?.path ?? 'README.md'}
          />
        </div>
      </article>
    </main>
  );
}

function safelyDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

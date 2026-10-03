import {
  loadExperiences,
  loadProject,
  loadProjects,
  loadThought,
  loadThoughts,
} from './portfolio-content.js';

const SITE_TITLE = 'Shiming Yuan';

export async function loadRouteData(portfolioHome, pathname, siteUrl) {
  const base = siteUrl.replace(/\/+$/, '');

  if (!portfolioHome) {
    return {
      data: {},
      meta: { title: SITE_TITLE, description: '', canonical: `${base}${pathname}`, type: 'website' },
    };
  }

  if (pathname === '/') {
    const [thoughts, projects, experiences] = await Promise.all([
      loadThoughts(portfolioHome),
      loadProjects(portfolioHome),
      loadExperiences(portfolioHome),
    ]);
    return {
      data: { thoughts, projects, experiences },
      meta: {
        title: SITE_TITLE,
        description: 'Curiosity-driven by nature, builder by choice.',
        canonical: `${base}/`,
        type: 'website',
        jsonLd: buildPersonJsonLd(base),
      },
    };
  }

  if (pathname === '/thoughts') {
    const thoughts = await loadThoughts(portfolioHome);
    return {
      data: { thoughts },
      meta: {
        title: `Thoughts — ${SITE_TITLE}`,
        description: 'Musings on deep technical architecture, minimal interfaces, and system resilience. Constantly learning.',
        canonical: `${base}/thoughts`,
        type: 'website',
        jsonLd: buildBlogJsonLd(`${base}/thoughts`),
      },
    };
  }

  if (pathname.startsWith('/thoughts/')) {
    const id = decodeSegment(pathname.slice('/thoughts/'.length));
    const [body, thoughts] = await Promise.all([
      loadThought(portfolioHome, id),
      loadThoughts(portfolioHome).catch(() => []),
    ]);
    const summary = thoughts.find((thought) => thought.id === id) ?? null;
    const canonical = `${base}/thoughts/${encodeURIComponent(id)}`;
    return {
      data: { [`thought:${id}`]: { body, summary } },
      meta: {
        title: summary?.title || id,
        description: summary?.brief || '',
        canonical,
        type: 'article',
        publishedTime: summary?.date,
        section: summary?.categories?.[0],
        tags: summary?.tags ?? [],
        jsonLd: summary ? buildBlogPostingJsonLd(summary, canonical) : undefined,
      },
    };
  }

  if (pathname === '/projects') {
    const projects = await loadProjects(portfolioHome);
    return {
      data: { projects },
      meta: {
        title: `Projects — ${SITE_TITLE}`,
        description: "A collection of tools, libraries, and distributed systems I've built over the years.",
        canonical: `${base}/projects`,
        type: 'website',
        jsonLd: buildCollectionPageJsonLd('Projects', `${base}/projects`),
      },
    };
  }

  if (pathname.startsWith('/projects/')) {
    const segments = pathname.slice('/projects/'.length).split('/').filter(Boolean);
    if (segments.length < 1 || segments.length > 2) {
      throw notFound(`No route for ${pathname}`);
    }

    const id = decodeSegment(segments[0]);
    const project = await loadProject(portfolioHome, id);
    const canonical = `${base}/projects/${encodeURIComponent(id)}`;

    if (segments.length === 1) {
      return {
        data: { [`project:${id}`]: project },
        meta: {
          title: project.project_name || id,
          description: project.brief || '',
          canonical,
          type: 'article',
          jsonLd: buildArticleJsonLd(project, canonical),
        },
      };
    }

    const documentId = decodeSegment(segments[1]);
    const document = project.documents.find(
      (doc) => stripMarkdownExtension(doc.path) === documentId,
    );
    if (!document) {
      throw notFound(`Document not found: ${documentId}`);
    }

    const documentCanonical = `${canonical}/${encodeURIComponent(documentId)}`;
    return {
      data: { [`project:${id}`]: project },
      meta: {
        title: document.title || project.project_name || id,
        description: document.brief || project.brief || '',
        canonical: documentCanonical,
        type: 'article',
        jsonLd: buildArticleJsonLd(
          {
            project_name: document.title || project.project_name,
            brief: document.brief || project.brief || '',
          },
          documentCanonical,
        ),
      },
    };
  }

  if (pathname === '/experience') {
    const experiences = await loadExperiences(portfolioHome);
    return {
      data: { experiences },
      meta: {
        title: `Experience — ${SITE_TITLE}`,
        description: 'A timeline of professional roles and personal milestones.',
        canonical: `${base}/experience`,
        type: 'website',
        jsonLd: buildCollectionPageJsonLd('Experience', `${base}/experience`),
      },
    };
  }

  throw notFound(`No route for ${pathname}`);
}

function buildBlogPostingJsonLd(summary, canonical) {
  const published = summary.date ? new Date(summary.date * 1000).toISOString() : undefined;
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: summary.title,
    description: summary.brief,
    datePublished: published,
    dateModified: published,
    inLanguage: summary.lang,
    author: { '@type': 'Person', name: 'Shiming Yuan' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    keywords: (summary.tags ?? []).join(', '),
  });
}

function buildArticleJsonLd(project, canonical) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: project.project_name,
    description: project.brief,
    author: { '@type': 'Person', name: 'Shiming Yuan' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
  });
}

function buildPersonJsonLd(siteUrl) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Shiming Yuan',
    url: siteUrl,
  });
}

function buildBlogJsonLd(url) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Thoughts',
    url,
  });
}

function buildCollectionPageJsonLd(name, url) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url,
  });
}

function decodeSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw notFound('Invalid encoded path');
  }
}

function stripMarkdownExtension(path) {
  return path.replace(/\.(md|markdown)$/i, '');
}

function notFound(message) {
  const error = new Error(message);
  error.code = 'RESOURCE_NOT_FOUND';
  return error;
}

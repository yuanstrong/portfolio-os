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
      },
    };
  }

  if (pathname.startsWith('/projects/')) {
    const id = decodeSegment(pathname.slice('/projects/'.length));
    const project = await loadProject(portfolioHome, id);
    const canonical = `${base}/projects/${encodeURIComponent(id)}`;
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

  if (pathname === '/experience') {
    const experiences = await loadExperiences(portfolioHome);
    return {
      data: { experiences },
      meta: {
        title: `Experience — ${SITE_TITLE}`,
        description: 'A timeline of professional roles and personal milestones.',
        canonical: `${base}/experience`,
        type: 'website',
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

function decodeSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw notFound('Invalid encoded path');
  }
}

function notFound(message) {
  const error = new Error(message);
  error.code = 'RESOURCE_NOT_FOUND';
  return error;
}

import { loadProjects, loadThoughts } from './portfolio-content.js';

export function formatSitemapDate(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString().slice(0, 10);
  }
  if (typeof value === 'string' && value.trim()) {
    const ms = Date.parse(value);
    if (Number.isFinite(ms)) {
      return new Date(ms).toISOString().slice(0, 10);
    }
  }
  return null;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemapXml(urls) {
  const entries = urls
    .map((url) => {
      const lastmod = url.lastmod ? `\n    <lastmod>${escapeXml(url.lastmod)}</lastmod>` : '';
      return `  <url>\n    <loc>${escapeXml(url.loc)}</loc>${lastmod}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

export function buildRobotsTxt(siteUrl) {
  const base = siteUrl.replace(/\/+$/, '');
  return `User-agent: *\nDisallow: /api/\nDisallow: /agents\nSitemap: ${base}/sitemap.xml\n`;
}

export async function collectSitemapUrls(portfolioHome, siteUrl) {
  const base = siteUrl.replace(/\/+$/, '');
  const staticPaths = ['/', '/thoughts', '/projects', '/experience'];
  const thoughts = portfolioHome ? await loadThoughts(portfolioHome).catch(() => []) : [];
  const projects = portfolioHome ? await loadProjects(portfolioHome).catch(() => []) : [];

  return [
    ...staticPaths.map((pathname) => ({ loc: `${base}${pathname}` })),
    ...thoughts.map((thought) => ({
      loc: `${base}/thoughts/${encodeURIComponent(thought.id)}`,
      lastmod: formatSitemapDate(thought.date),
    })),
    ...projects.map((project) => ({
      loc: `${base}/projects/${encodeURIComponent(project.project_id)}`,
      lastmod: formatSitemapDate(project.updated_at),
    })),
  ];
}

const SITE_NAME = 'Shiming Yuan';
const OG_IMAGE_URL = 'https://avatars.githubusercontent.com/u/5074089?v=4';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeScript(value) {
  return String(value).replace(/</g, '\\u003c');
}

function toIsoDate(seconds) {
  return new Date(seconds * 1000).toISOString();
}

export function buildHtml({ template, meta, appHtml, initialData }) {
  const { title, description, canonical, type, jsonLd, publishedTime, section, tags = [] } = meta;

  const headTags = [
    description ? `<meta name="description" content="${escapeHtml(description)}" />` : null,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:type" content="${escapeHtml(type)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    description ? `<meta property="og:description" content="${escapeHtml(description)}" />` : null,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(OG_IMAGE_URL)}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    description ? `<meta name="twitter:description" content="${escapeHtml(description)}" />` : null,
    `<meta name="twitter:image" content="${escapeHtml(OG_IMAGE_URL)}" />`,
    publishedTime
      ? `<meta property="article:published_time" content="${escapeHtml(toIsoDate(publishedTime))}" />`
      : null,
    section ? `<meta property="article:section" content="${escapeHtml(section)}" />` : null,
    ...tags.map((tag) => `<meta property="article:tag" content="${escapeHtml(tag)}" />`),
    jsonLd ? `<script type="application/ld+json">${escapeScript(jsonLd)}</script>` : null,
  ].filter(Boolean).join('\n    ');

  const initDataScript = `<script>window.__INITIAL_DATA__ = ${escapeScript(JSON.stringify(initialData))}</script>`;

  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace('<!--app-html-->', appHtml)
    .replace('</head>', `    ${headTags}\n    ${initDataScript}\n  </head>`);
}

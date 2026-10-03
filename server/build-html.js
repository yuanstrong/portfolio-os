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
  const { title, description, canonical, type, jsonLd, publishedTime } = meta;

  const tags = [
    description ? `<meta name="description" content="${escapeHtml(description)}" />` : null,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:type" content="${escapeHtml(type)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    description ? `<meta property="og:description" content="${escapeHtml(description)}" />` : null,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    description ? `<meta name="twitter:description" content="${escapeHtml(description)}" />` : null,
    publishedTime
      ? `<meta property="article:published_time" content="${escapeHtml(toIsoDate(publishedTime))}" />`
      : null,
    jsonLd ? `<script type="application/ld+json">${escapeScript(jsonLd)}</script>` : null,
  ].filter(Boolean).join('\n    ');

  const initDataScript = `<script>window.__INITIAL_DATA__ = ${escapeScript(JSON.stringify(initialData))}</script>`;

  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace('<!--app-html-->', appHtml)
    .replace('</head>', `    ${tags}\n    ${initDataScript}\n  </head>`);
}

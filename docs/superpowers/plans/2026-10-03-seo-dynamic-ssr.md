# SEO 动态 SSR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Express 服务器按请求渲染每个内容页的完整 HTML（含正文 + 每页 meta），并产出 sitemap.xml / robots.txt，使搜索引擎能直接抓取博客与项目内容。

**Architecture:** 服务端新增 `loadRouteData`（URL → 内容数据 + meta）、`buildHtml`（注入 title/description/canonical/OG/JSON-LD + `__INITIAL_DATA__`）、`sitemap`（动态 sitemap/robots）。React 侧新增 `ResourceProvider` 上下文，`useAsyncResource` 改为按 key 从上下文取服务端数据（有则跳过 fetch），实现 SSR 与客户端 hydration 对齐。`app.js` 用显式路由渲染 HTML，替换原 SPA fallback。移除 prerender 步骤。

**Tech Stack:** Vite 8、React 19、React Router 7、Express 5、node:test + tsx、`server/portfolio-content.js` 内容加载器。

**约定：** 服务端文件用 `.js`（与现有 `server/*.js` 一致）；测试用 `node --import tsx --test <file>` 单独运行（在 Task 7 才把新测试文件并入 `test:api`）。每一步的测试命令都写明了预期输出。

---

## Task 1: 数据 hydration 机制（ResourceContext + useAsyncResource + 页面传 key）

**Files:**
- Create: `src/data/ResourceContext.tsx`
- Modify: `src/hooks/useAsyncResource.ts`
- Modify: `src/pages/Home.tsx`、`src/pages/Thoughts.tsx`、`src/pages/BlogPost.tsx`、`src/pages/Projects.tsx`、`src/pages/ProjectDetail.tsx`、`src/pages/Experience.tsx`
- Test: `src/hooks/useAsyncResource.test.tsx`

- [ ] **Step 1: 写失败测试**

Create `src/hooks/useAsyncResource.test.tsx`:

```tsx
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { renderToStaticMarkup } from 'react-dom/server';

import { ResourceProvider } from '../data/ResourceContext';
import { useAsyncResource } from './useAsyncResource';

function Probe({ label }: { label: string }) {
  const resource = useAsyncResource<string>('thoughts', async () => 'fetched', []);
  if (resource.status === 'loading') {
    return <span>{label}:loading</span>;
  }
  if (resource.status === 'error') {
    return <span>{label}:error</span>;
  }
  return <span>{label}:{resource.data}</span>;
}

test('uses server-provided data when present instead of loading', () => {
  const markup = renderToStaticMarkup(
    <ResourceProvider data={{ thoughts: 'server-thoughts' }}>
      <Probe label="probe" />
    </ResourceProvider>,
  );
  assert.match(markup, /probe:server-thoughts/);
  assert.doesNotMatch(markup, /probe:loading/);
});

test('falls back to loading when no server data is provided', () => {
  const markup = renderToStaticMarkup(
    <ResourceProvider data={{}}>
      <Probe label="probe" />
    </ResourceProvider>,
  );
  assert.match(markup, /probe:loading/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test src/hooks/useAsyncResource.test.tsx`
Expected: FAIL — `Cannot find module '../data/ResourceContext'`（模块尚不存在）

- [ ] **Step 3: 创建 ResourceContext**

Create `src/data/ResourceContext.tsx`:

```tsx
import { createContext, type ReactNode } from 'react';

declare global {
  interface Window {
    __INITIAL_DATA__?: Record<string, unknown>;
  }
}

export const ResourceContext = createContext<Record<string, unknown>>({});

export function ResourceProvider({
  data,
  children,
}: {
  data: Record<string, unknown>;
  children: ReactNode;
}) {
  return (
    <ResourceContext.Provider value={data}>
      {children}
    </ResourceContext.Provider>
  );
}
```

- [ ] **Step 4: 修改 useAsyncResource 增加 key 参数**

Replace the full contents of `src/hooks/useAsyncResource.ts` with:

```ts
import { useContext, useEffect, useState, type DependencyList } from 'react';
import { ResourceContext } from '../data/ResourceContext';

type ResourceState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: T; error: null }
  | { status: 'error'; data: null; error: Error };

export function useAsyncResource<T>(
  key: string,
  load: () => Promise<T>,
  dependencies: DependencyList = [],
): ResourceState<T> {
  const serverData = useContext(ResourceContext);
  const hasServerData = Object.prototype.hasOwnProperty.call(serverData, key);
  const [state, setState] = useState<ResourceState<T>>(
    hasServerData
      ? { status: 'ready', data: serverData[key] as T, error: null }
      : { status: 'loading', data: null, error: null },
  );

  useEffect(() => {
    if (hasServerData) {
      return;
    }

    let cancelled = false;

    setState({ status: 'loading', data: null, error: null });
    load()
      .then((data) => {
        if (!cancelled) {
          setState({ status: 'ready', data, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            data: null,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, dependencies);

  return state;
}
```

- [ ] **Step 5: 更新所有调用点传入 key**

In `src/pages/Home.tsx`, change the three hook calls to:

```tsx
  const thoughts = useAsyncResource('thoughts', fetchThoughts, []);
  const projects = useAsyncResource('projects', fetchProjects, []);
  const experiences = useAsyncResource('experiences', fetchExperiences, []);
```

In `src/pages/Thoughts.tsx`:

```tsx
  const thoughts = useAsyncResource('thoughts', fetchThoughts, []);
```

In `src/pages/Projects.tsx`:

```tsx
  const projects = useAsyncResource('projects', fetchProjects, []);
```

In `src/pages/Experience.tsx`:

```tsx
  const experiences = useAsyncResource('experiences', fetchExperiences, []);
```

In `src/pages/BlogPost.tsx`, change the hook call to (keep the existing load function body unchanged):

```tsx
  const post = useAsyncResource<ThoughtPost>(
    `thought:${thoughtId ?? ''}`,
    async () => {
      if (!thoughtId) {
        throw new Error('missing thought id');
      }

      const [thoughts, body] = await Promise.all([
        fetchThoughts().catch(() => []),
        fetchThought(thoughtId),
      ]);

      return {
        body,
        summary: thoughts.find((thought) => thought.id === thoughtId) ?? null,
      };
    },
    [id],
  );
```

In `src/pages/ProjectDetail.tsx`, change the hook call to (keep the existing load function body unchanged):

```tsx
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
```

- [ ] **Step 6: 运行测试确认通过**

Run: `node --import tsx --test src/hooks/useAsyncResource.test.tsx`
Expected: PASS（2 tests）

- [ ] **Step 7: 类型检查**

Run: `pnpm run lint`
Expected: PASS（`tsc --noEmit` 无报错）

- [ ] **Step 8: Commit**

```bash
git add src/data/ResourceContext.tsx src/hooks/useAsyncResource.ts src/hooks/useAsyncResource.test.tsx src/pages/Home.tsx src/pages/Thoughts.tsx src/pages/BlogPost.tsx src/pages/Projects.tsx src/pages/ProjectDetail.tsx src/pages/Experience.tsx
git commit -m "feat: hydrate async resources from server-provided data"
```

---

## Task 2: SSR 入口与客户端入口注入 ResourceProvider

**Files:**
- Modify: `src/entry-server.tsx`
- Modify: `src/main.tsx`
- Test: `src/entry-server.test.tsx`

- [ ] **Step 1: 写失败测试**

Create `src/entry-server.test.tsx`:

```tsx
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { render } from './entry-server';

test('render embeds server data into the markup instead of the loading state', () => {
  const html = render('/thoughts', {
    thoughts: [
      {
        id: 'zero-depth',
        title: 'Zero Depth',
        tags: [],
        categories: [],
        date: 0,
        brief: 'Interfaces without shadows',
      },
    ],
  });

  assert.match(html, /Zero Depth/);
  assert.doesNotMatch(html, /loading_thoughts/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test src/entry-server.test.tsx`
Expected: FAIL — `doesNotMatch` 断言失败（`loading_thoughts` 仍在输出中，因为 render 还没传 data）

- [ ] **Step 3: 修改 entry-server 接受 data 并包裹 ResourceProvider**

Replace `src/entry-server.tsx` with:

```tsx
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { ResourceProvider } from './data/ResourceContext';

export function render(url: string, data: Record<string, unknown> = {}) {
  return renderToString(
    <React.StrictMode>
      <ResourceProvider data={data}>
        <MemoryRouter initialEntries={[url]}>
          <App />
        </MemoryRouter>
      </ResourceProvider>
    </React.StrictMode>
  );
}
```

（删除 `getRoutes` 导出——prerender 将在 Task 7 移除。）

- [ ] **Step 4: 修改 main.tsx 读取 window.__INITIAL_DATA__**

Replace `src/main.tsx` with:

```tsx
import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { ResourceProvider } from './data/ResourceContext';
import './index.css';

const rootElement = document.getElementById('root')!;
const initialData = window.__INITIAL_DATA__ ?? {};
const app = (
  <StrictMode>
    <ResourceProvider data={initialData}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ResourceProvider>
  </StrictMode>
);

const isHtmlEmpty =
  rootElement.innerHTML.trim() === '' ||
  rootElement.innerHTML.trim() === '<!--app-html-->';

if (isHtmlEmpty) {
  createRoot(rootElement).render(app);
} else {
  hydrateRoot(rootElement, app);
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `node --import tsx --test src/entry-server.test.tsx`
Expected: PASS

- [ ] **Step 6: 类型检查**

Run: `pnpm run lint`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/entry-server.tsx src/entry-server.test.tsx src/main.tsx
git commit -m "feat: pass server data through SSR and hydrate on the client"
```

---

## Task 3: buildHtml 模块（meta 注入）

**Files:**
- Create: `server/build-html.js`
- Test: `server/build-html.test.js`

- [ ] **Step 1: 写失败测试**

Create `server/build-html.test.js`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildHtml } from './build-html.js';

const template = [
  '<!doctype html>',
  '<html><head><meta charset="utf-8"><title>Shiming Yuan</title></head>',
  '<body><div id="root"><!--app-html--></div></body></html>',
].join('\n');

test('injects title, description, canonical, og and twitter tags', () => {
  const html = buildHtml({
    template,
    meta: {
      title: 'Zero Depth',
      description: 'Interfaces without shadows',
      canonical: 'https://shiming.dev/thoughts/zero-depth',
      type: 'article',
    },
    appHtml: '<main>content</main>',
    initialData: {},
  });

  assert.match(html, /<title>Zero Depth<\/title>/);
  assert.match(html, /<meta name="description" content="Interfaces without shadows" \/>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/shiming.dev\/thoughts\/zero-depth" \/>/);
  assert.match(html, /<meta property="og:type" content="article" \/>/);
  assert.match(html, /<meta property="og:title" content="Zero Depth" \/>/);
  assert.match(html, /<meta name="twitter:card" content="summary" \/>/);
  assert.match(html, /<main>content<\/main>/);
  assert.doesNotMatch(html, /<!--app-html-->/);
});

test('escapes content to prevent script-tag breakout in initial data', () => {
  const html = buildHtml({
    template,
    meta: { title: 'T', description: '', canonical: 'https://x/', type: 'website' },
    appHtml: '<main></main>',
    initialData: { thought: { body: 'alert("x")</script><script>alert(1)</script>' } },
  });

  assert.doesNotMatch(html, /<\/script><script>/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test server/build-html.test.js`
Expected: FAIL — `Cannot find module './build-html.js'`

- [ ] **Step 3: 实现 buildHtml**

Create `server/build-html.js`:

```js
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --import tsx --test server/build-html.test.js`
Expected: PASS（2 tests）

- [ ] **Step 5: Commit**

```bash
git add server/build-html.js server/build-html.test.js
git commit -m "feat: add buildHtml meta injection for SEO"
```

---

## Task 4: route-data 模块（URL → 数据 + meta）

**Files:**
- Create: `server/route-data.js`
- Test: `server/route-data.test.js`

- [ ] **Step 1: 写失败测试**

Create `server/route-data.test.js`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

import { loadRouteData } from './route-data.js';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function makePortfolioHome() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'route-data-'));
  temporaryDirectories.push(directory);
  return directory;
}

test('maps the home route to thoughts, projects and experiences', async () => {
  const home = await makePortfolioHome();
  const route = await loadRouteData(home, '/', 'https://shiming.dev');

  assert.deepEqual(Object.keys(route.data).sort(), ['experiences', 'projects', 'thoughts']);
  assert.equal(route.meta.title, 'Shiming Yuan');
  assert.equal(route.meta.canonical, 'https://shiming.dev/');
});

test('maps a thought detail route to its body and summary', async () => {
  const home = await makePortfolioHome();
  await fs.mkdir(path.join(home, 'thoughts'));
  await fs.writeFile(
    path.join(home, 'thoughts/zero-depth.md'),
    [
      '---',
      'title: Zero Depth',
      'brief: Interfaces without shadows',
      'date: 2026-09-23',
      'tags: [ui]',
      '---',
      '',
      '# Zero Depth',
    ].join('\n'),
  );

  const route = await loadRouteData(home, '/thoughts/zero-depth', 'https://shiming.dev');

  assert.deepEqual(Object.keys(route.data), ['thought:zero-depth']);
  assert.equal(route.data['thought:zero-depth'].body, '# Zero Depth');
  assert.equal(route.data['thought:zero-depth'].summary.title, 'Zero Depth');
  assert.equal(route.meta.title, 'Zero Depth');
  assert.equal(route.meta.type, 'article');
  assert.match(route.meta.jsonLd, /"@type":"BlogPosting"/);
});

test('throws RESOURCE_NOT_FOUND for an unknown thought', async () => {
  const home = await makePortfolioHome();
  await assert.rejects(
    () => loadRouteData(home, '/thoughts/missing', 'https://shiming.dev'),
    (error) => error.code === 'RESOURCE_NOT_FOUND',
  );
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test server/route-data.test.js`
Expected: FAIL — `Cannot find module './route-data.js'`

- [ ] **Step 3: 实现 route-data**

Create `server/route-data.js`:

```js
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --import tsx --test server/route-data.test.js`
Expected: PASS（3 tests）

- [ ] **Step 5: Commit**

```bash
git add server/route-data.js server/route-data.test.js
git commit -m "feat: add server route data loading with per-page meta"
```

---

## Task 5: sitemap 模块

**Files:**
- Create: `server/sitemap.js`
- Test: `server/sitemap.test.js`

- [ ] **Step 1: 写失败测试**

Create `server/sitemap.test.js`:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

import { buildRobotsTxt, buildSitemapXml, collectSitemapUrls, formatSitemapDate } from './sitemap.js';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function makePortfolioHome() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sitemap-'));
  temporaryDirectories.push(directory);
  return directory;
}

test('formatSitemapDate converts unix seconds and date strings to YYYY-MM-DD', () => {
  assert.equal(formatSitemapDate(0), '1970-01-01');
  assert.equal(formatSitemapDate('2026-09-23'), '2026-09-23');
  assert.equal(formatSitemapDate('not a date'), null);
});

test('buildSitemapXml renders valid urlset entries with optional lastmod', () => {
  const xml = buildSitemapXml([
    { loc: 'https://shiming.dev/', lastmod: null },
    { loc: 'https://shiming.dev/thoughts/zero-depth', lastmod: '2026-09-23' },
  ]);

  assert.match(xml, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
  assert.match(xml, /<loc>https:\/\/shiming.dev\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/shiming.dev\/thoughts\/zero-depth<\/loc>/);
  assert.match(xml, /<lastmod>2026-09-23<\/lastmod>/);
  assert.doesNotMatch(xml, /<lastmod>null<\/lastmod>/);
});

test('buildRobotsTxt disallows api and agents and points to the sitemap', () => {
  const robots = buildRobotsTxt('https://shiming.dev/');
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Disallow: \/agents/);
  assert.match(robots, /Sitemap: https:\/\/shiming.dev\/sitemap.xml/);
});

test('collectSitemapUrls lists static pages and content urls', async () => {
  const home = await makePortfolioHome();
  await fs.mkdir(path.join(home, 'thoughts'));
  await fs.writeFile(
    path.join(home, 'thoughts/zero-depth.md'),
    ['---', 'title: Zero Depth', 'date: 2026-09-23', '---', '', 'Body'].join('\n'),
  );

  const urls = await collectSitemapUrls(home, 'https://shiming.dev');

  const locs = urls.map((url) => url.loc);
  assert.ok(locs.includes('https://shiming.dev/'));
  assert.ok(locs.includes('https://shiming.dev/thoughts'));
  assert.ok(locs.includes('https://shiming.dev/thoughts/zero-depth'));
  assert.ok(locs.includes('https://shiming.dev/projects'));
  assert.ok(locs.includes('https://shiming.dev/experience'));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test server/sitemap.test.js`
Expected: FAIL — `Cannot find module './sitemap.js'`

- [ ] **Step 3: 实现 sitemap**

Create `server/sitemap.js`:

```js
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --import tsx --test server/sitemap.test.js`
Expected: PASS（4 tests）

- [ ] **Step 5: Commit**

```bash
git add server/sitemap.js server/sitemap.test.js
git commit -m "feat: add dynamic sitemap and robots generation"
```

---

## Task 6: Express SSR 接线（app.js + index.js）

**Files:**
- Modify: `server/app.js`
- Modify: `server/index.js`
- Test: `server/app.test.js`（扩展）

- [ ] **Step 1: 写失败测试**

Replace `server/app.test.js` with:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { afterEach, test } from 'node:test';

import { createApp } from './app.js';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function makePortfolioHome() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'app-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function makeStaticRoot() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'app-static-'));
  temporaryDirectories.push(directory);
  await fs.writeFile(
    path.join(directory, 'index.html'),
    '<!doctype html><html><head><title>Shiming Yuan</title></head><body><div id="root"><!--app-html--></div></body></html>',
  );
  return directory;
}

async function startServer(app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

test('production app can be constructed with the Express 5 SPA fallback', () => {
  assert.doesNotThrow(() => createApp({ portfolioHome: '/tmp/portfolio-home-test' }));
});

test('serves a rendered thought with meta and content', async () => {
  const home = await makePortfolioHome();
  const staticRoot = await makeStaticRoot();
  await fs.mkdir(path.join(home, 'thoughts'));
  await fs.writeFile(
    path.join(home, 'thoughts/zero-depth.md'),
    [
      '---',
      'title: Zero Depth',
      'brief: Interfaces without shadows',
      'date: 2026-09-23',
      '---',
      '',
      '# Zero Depth',
    ].join('\n'),
  );

  const app = createApp({ portfolioHome: home, staticRoot, siteUrl: 'https://shiming.dev' });
  const { baseUrl, close } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/thoughts/zero-depth`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<title>Zero Depth<\/title>/);
    assert.match(html, /<meta name="description" content="Interfaces without shadows" \/>/);
    assert.match(html, /<h1[^>]*>Zero Depth<\/h1>/);
    assert.doesNotMatch(html, /loading_thought/);
  } finally {
    await close();
  }
});

test('returns 404 for an unknown thought', async () => {
  const home = await makePortfolioHome();
  const staticRoot = await makeStaticRoot();
  const app = createApp({ portfolioHome: home, staticRoot, siteUrl: 'https://shiming.dev' });
  const { baseUrl, close } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/thoughts/missing`);
    assert.equal(response.status, 404);
  } finally {
    await close();
  }
});

test('serves a sitemap and robots.txt', async () => {
  const home = await makePortfolioHome();
  const staticRoot = await makeStaticRoot();
  const app = createApp({ portfolioHome: home, staticRoot, siteUrl: 'https://shiming.dev' });
  const { baseUrl, close } = await startServer(app);

  try {
    const sitemap = await fetch(`${baseUrl}/sitemap.xml`);
    assert.equal(sitemap.status, 200);
    assert.match(await sitemap.text(), /<urlset/);

    const robots = await fetch(`${baseUrl}/robots.txt`);
    assert.equal(robots.status, 200);
    assert.match(await robots.text(), /Sitemap: https:\/\/shiming.dev\/sitemap.xml/);
  } finally {
    await close();
  }
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test server/app.test.js`
Expected: FAIL — 渲染的 thought 路由返回 SPA fallback（无正文/meta），或 `loading_thought` 仍在输出中。

- [ ] **Step 3: 实现 app.js SSR 渲染**

Replace `server/app.js` with:

```js
import fs from 'node:fs/promises';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createResourceMiddleware } from './portfolio-content.js';
import { loadRouteData } from './route-data.js';
import { buildHtml } from './build-html.js';
import { buildRobotsTxt, buildSitemapXml, collectSitemapUrls } from './sitemap.js';
import { render } from '../src/entry-server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp({
  portfolioHome,
  staticRoot = path.join(__dirname, '..', 'dist', 'static'),
  siteUrl = 'http://localhost:3000',
} = {}) {
  const app = express();

  app.use(createResourceMiddleware(portfolioHome));
  app.use(express.static(staticRoot));

  const templatePath = path.join(staticRoot, 'index.html');

  async function renderPage(req, res) {
    let route;
    try {
      route = await loadRouteData(portfolioHome, req.path, siteUrl);
    } catch (error) {
      const status = error?.code === 'RESOURCE_NOT_FOUND' ? 404 : 500;
      res.status(status).type('text/plain').send(status === 404 ? 'Not found' : 'Internal server error');
      return;
    }

    const template = await fs.readFile(templatePath, 'utf8');
    const appHtml = render(req.path, route.data);
    const html = buildHtml({ template, meta: route.meta, appHtml, initialData: route.data });

    res.status(200).type('html').send(html);
  }

  app.get(['/', '/thoughts', '/projects', '/experience'], renderPage);
  app.get('/thoughts/:id', renderPage);
  app.get('/projects/:id', renderPage);

  app.get('/sitemap.xml', async (req, res) => {
    const urls = await collectSitemapUrls(portfolioHome, siteUrl);
    res.type('application/xml').send(buildSitemapXml(urls));
  });

  app.get('/robots.txt', (req, res) => {
    res.type('text/plain').send(buildRobotsTxt(siteUrl));
  });

  app.use((req, res) => {
    res.status(404).type('text/plain').send('Not found');
  });

  return app;
}
```

- [ ] **Step 4: 修改 index.js 传入 siteUrl**

In `server/index.js`, add a `siteUrl` constant and pass it to `createApp`:

```js
const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000';
```

and change the `createApp` call to:

```js
const app = createApp({
  portfolioHome,
  staticRoot: path.join(artifactRoot, 'static'),
  siteUrl,
});
```

- [ ] **Step 5: 运行测试确认通过**

Run: `node --import tsx --test server/app.test.js`
Expected: PASS（5 tests）

- [ ] **Step 6: Commit**

```bash
git add server/app.js server/index.js server/app.test.js
git commit -m "feat: render full HTML with meta on the server for all content routes"
```

---

## Task 7: 构建清理 + 脚本 + 环境 + 运行时依赖

**Files:**
- Modify: `package.json`
- Modify: `server/prepare-runtime-package.js`
- Modify: `server/artifact.test.js`
- Modify: `.env.example`
- Delete: `server/prerender.js`

- [ ] **Step 1: 写失败测试（更新 artifact 断言）**

In `server/artifact.test.js`, change:

```js
  assert.ok(packageJson.scripts['build:server:runtime']);
```

to:

```js
  assert.ok(packageJson.scripts['build:server']);
  assert.equal(packageJson.scripts['build:server'], 'vite build --ssr server/index.js --outDir dist/server');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --import tsx --test server/artifact.test.js`
Expected: FAIL — `build:server` 目前是 `pnpm run build:server:ssr && pnpm run build:server:runtime`，不等于新断言的值。

- [ ] **Step 3: 更新 package.json 脚本**

In `package.json`, replace:

```json
    "build": "pnpm run build:client && pnpm run build:server && pnpm run prerender",
    "build:client": "vite build --outDir dist/static",
    "build:server": "pnpm run build:server:ssr && pnpm run build:server:runtime",
    "build:server:ssr": "vite build --ssr src/entry-server.tsx --outDir dist/server",
    "build:server:runtime": "vite build --ssr server/index.js --outDir dist/server --emptyOutDir=false",
    "prerender": "node server/prerender.js",
```

with:

```json
    "build": "pnpm run build:client && pnpm run build:server",
    "build:client": "vite build --outDir dist/static",
    "build:server": "vite build --ssr server/index.js --outDir dist/server",
```

Also in `package.json`, update `test:api` to include the new test files:

```json
    "test:api": "node --import tsx --test src/api/resources.test.ts src/api/auth.test.ts src/api/stream.test.ts src/hooks/useAsyncResource.test.tsx src/entry-server.test.tsx server/portfolio-content.test.js server/app.test.js server/artifact.test.js server/route-data.test.js server/build-html.test.js server/sitemap.test.js",
```

- [ ] **Step 4: 更新 prepare-runtime-package.js 的运行时依赖**

In `server/prepare-runtime-package.js`, change:

```js
const runtimeDependencyNames = ['dotenv', 'express', 'yaml'];
```

to:

```js
const runtimeDependencyNames = [
  'dotenv',
  'express',
  'yaml',
  'react',
  'react-dom',
  'react-router-dom',
  'react-markdown',
  'remark-gfm',
  'react-syntax-highlighter',
  'mermaid',
  'lucide-react',
];
```

（这些是 `dist/server/index.js` 现在外置、运行时需要从 node_modules 解析的包。）

- [ ] **Step 5: 删除 prerender**

Run: `rm server/prerender.js`

- [ ] **Step 6: 更新 .env.example**

Append to `.env.example`:

```
# Base URL used for canonical links, Open Graph tags and the sitemap.
SITE_URL=https://shiming.dev
```

- [ ] **Step 7: 运行测试确认通过**

Run: `node --import tsx --test server/artifact.test.js`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add package.json server/prepare-runtime-package.js server/artifact.test.js .env.example
git rm server/prerender.js
git commit -m "chore: remove prerender, simplify build, include SSR runtime deps"
```

---

## Task 8: 端到端验证

**Files:** 无（验证任务）

- [ ] **Step 1: 类型检查**

Run: `pnpm run lint`
Expected: PASS

- [ ] **Step 2: 全量测试**

Run: `pnpm test`
Expected: 所有 test:api + test:agents 通过

- [ ] **Step 3: 构建**

Run: `pnpm run build`
Expected: 成功产出 `dist/static/index.html` + `dist/server/index.js`（无 prerender 报错）

- [ ] **Step 4: 启动并 curl 各路由**

Run（后台启动，然后逐条 curl）:

```bash
SITE_URL=http://localhost:3000 pnpm start &
```

Wait a moment, then:

```bash
curl -s http://localhost:3000/thoughts/matter-vs-thread | grep -o '<title>[^<]*</title>'
curl -s http://localhost:3000/thoughts/matter-vs-thread | grep -c 'Matter vs Thread'
curl -s http://localhost:3000/thoughts/matter-vs-thread | grep -o '<meta name="description"[^>]*>'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/thoughts/nonexistent
curl -s http://localhost:3000/sitemap.xml | head -c 200
curl -s http://localhost:3000/robots.txt
```

Expected:
- `<title>` 是博客标题（非 "Shiming Yuan"）
- 正文 `Matter vs Thread` 出现在 HTML 里（count ≥ 1）
- 有 `<meta name="description">`
- 不存在的 thought 返回 `404`
- sitemap.xml 以 `<?xml` 开头
- robots.txt 含 `Sitemap:` 行

- [ ] **Step 5: 验证无 loading 骨架**

Run: `curl -s http://localhost:3000/thoughts | grep -c 'loading_thoughts'`
Expected: `0`

- [ ] **Step 6: 停掉后台服务**

Run: `kill %1`（或 `pkill -f 'dist/server/index.js'`）

---

## Self-Review Notes

- **Spec 覆盖**：数据预取（Task 4）、hydration 对齐（Task 1/2）、meta 注入（Task 3）、Express 渲染（Task 6）、sitemap/robots（Task 5）、清理 prerender（Task 7）、错误处理与转义（Task 3/4/6 内联）、测试（各 Task）。全部覆盖。
- **类型一致性**：`useAsyncResource(key, load, deps)` 签名、`ResourceContext`、`render(url, data)`、`buildHtml({template,meta,appHtml,initialData})`、`loadRouteData(home, pathname, siteUrl)`、`collectSitemapUrls(home, siteUrl)`、`buildSitemapXml(urls)`、`buildRobotsTxt(siteUrl)` 在前后任务中命名一致。data key（`thoughts`/`projects`/`experiences`/`thought:<id>`/`project:<id>`）在 Task 1（页面）、Task 4（route-data）中完全对齐。
- **安全**：`buildHtml` 用 `escapeScript` 对 `__INITIAL_DATA__` 和 JSON-LD 转义 `<`，防止 `</script>` 逃逸。

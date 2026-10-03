# SEO 动态 SSR 设计文档

- 日期：2026-10-03
- 状态：已确认（待实现）
- 范围：全站内容页（thoughts / projects / experience / home）

## 背景与问题

项目实际技术栈是 **Vite + React 19 + React Router 7 + Express**（不是 Next.js）。部署方式为：服务器 checkout 仓库 → 构建 → `pnpm start` 运行 `node dist/server/index.js`，内容从 `PORTFOLIO_HOME`（`./home`）按请求实时读取。站点域名 `https://shiming.dev`。

当前 SEO 问题（按影响排序）：

1. **内容全是客户端 `fetch`**。所有页面用 `useAsyncResource`（`useEffect` 内 `fetch`），而 SSR 的 `renderToString` 不执行 `useEffect`，因此预渲染 HTML 里只有 loading 骨架，没有真实正文。
2. **单篇博客 / 项目详情页未进预渲染**。`src/entry-server.tsx` 的 `getRoutes()` 只返回 `/`、`/thoughts`、`/experience`、`/projects` 四个路由，`/thoughts/:id`、`/projects/:id` 缺失，爬虫只能拿到空 `index.html`。
3. **无 per-page meta**。`index.html` 只有一个 `<title>Shiming Yuan</title>`，无 description / Open Graph / canonical / JSON-LD。
4. **缺 `robots.txt` 和 `sitemap.xml`**。

## 目标

- 搜索引擎（含不执行 JS 的引擎）能直接拿到每个内容页的完整正文 HTML。
- 每个内容页有正确的 title / description / canonical / Open Graph / JSON-LD。
- 提供 `sitemap.xml` 与 `robots.txt`。
- 保持「改 markdown 即生效、无需重新 build」的 live 内容工作流。

## 非目标（本次不做）

- `og:image` 每篇配图（后续可加）。
- 迁移到 Next.js。
- 客户端 SPA 导航时的 `document.title` 同步（SEO 只关心服务端首屏 HTML，非必要）。
- 内容缓存（个人站流量下每次请求渲染成本可忽略）。

## 总体架构与数据流

```
浏览器请求 GET /thoughts/matter-vs-thread
        │
        ▼
Express (server/app.js)
        │
        ├─ /api/v1/resources/*  → 保留现有 API（供客户端 SPA 导航使用）
        ├─ /assets/* 等静态文件  → express.static 照旧
        └─ HTML 路由（新增）:
           1. loadRouteData(portfolioHome, path)   → 读 home/ 内容 + 派生 meta
           2. render(path, data)                   → SSR 渲染出完整正文 HTML
           3. buildHtml(template, meta, html, data) → 注入 <title>/meta/OG/JSON-LD + __INITIAL_DATA__
           4. res.send(html)
```

核心变化：从「返回空壳 + 客户端 fetch」改为「返回含完整正文的 HTML」。

## 详细设计

### 1. 服务端数据预取 `loadRouteData`

新增服务端模块（建议 `server/route-data.js`，与 `portfolio-content.js` 同层），复用其 loader（`loadThoughts` / `loadThought` / `loadProjects` / `loadProject` / `loadExperiences`），按路径返回 `{ data, meta }`。

路径 → data 映射（`data` 为 key → 值的对象）：

| 路径 | data key | 值 |
|---|---|---|
| `/` | `thoughts` / `projects` / `experiences` | 列表 |
| `/thoughts` | `thoughts` | 列表 |
| `/thoughts/:id` | `thought:<id>` | `{ body, summary }` |
| `/projects` | `projects` | 列表 |
| `/projects/:id` | `project:<id>` | 项目详情（含 body + documents） |
| `/experience` | `experiences` | 工作经历 |

meta 派生规则：

- `/`：`{ title: 'Shiming Yuan', description: 'Curiosity-driven by nature, builder by choice.', type: 'website', canonical: SITE_URL/ }`
- 列表页：`{ title: '<页名> — Shiming Yuan', description: <复用各页面现有描述文案>, type: 'website', canonical }`（thoughts 用 "Musings on deep technical architecture…"，projects 用 "A collection of tools, libraries, and distributed systems…"）
- `/thoughts/:id`：`{ title: summary.title, description: summary.brief, type: 'article', canonical, publishedTime: summary.date, tags: summary.tags }`，附带 `BlogPosting` JSON-LD
- `/projects/:id`：`{ title: project_name, description: brief, type: 'article', canonical, lastmod: updated_at }`

`loadRouteData` 对不存在的 id 抛出 `RESOURCE_NOT_FOUND`（复用现有错误约定），由路由层转 404。

### 2. 客户端 hydration 对齐

新增 `ResourceProvider`（React Context，建议 `src/data/ResourceContext.tsx`），值为 `Record<string, unknown>`：

- 服务端：`entry-server.tsx` 的 `render(url, data)` 改为 `renderToString(<ResourceProvider value={data}><MemoryRouter initialEntries={[url]}><App/></MemoryRouter></ResourceProvider>)`。
- 客户端：`main.tsx` 读取 `window.__INITIAL_DATA__`，用同样方式包 `<App/>`。

改造 `src/hooks/useAsyncResource.ts`，签名改为 `useAsyncResource<T>(key: string, load: () => Promise<T>, deps?)`：

- 从 Context 读 `initial = context[key]`（用 `Object.prototype.hasOwnProperty` 判断是否存在，避免 `undefined` 值歧义）。
- 若存在：初始 state 为 `{ status: 'ready', data: initial }`，`useEffect` 里**跳过 fetch**。
- 若不存在：维持现有行为（loading → fetch → ready/error），供 SPA 导航使用。

各页面传入的 key：

- Home：`thoughts` / `projects` / `experiences`
- Thoughts：`thoughts`
- BlogPost：`thought:<id>`（数据形为 `{ body, summary }`，与现有 `ThoughtPost` 类型一致）
- Projects：`projects`
- ProjectDetail：`project:<id>`
- Experience：`experiences`

顺带简化 `BlogPost.tsx`：现在它 `fetch` 整个 thoughts 列表再 `find` 出 summary；改为直接消费 `{ body, summary }`（服务端已算好），客户端 SPA 导航时仍由原 `load` 函数拼装。

### 3. meta 注入 `buildHtml`

meta 由服务端 `loadRouteData` 派生，不引入 React 层 `<head>` 管理器。`buildHtml(template, { meta, appHtml, initialData })` 向 `dist/static/index.html` 模板注入：

- `<title>`、`<meta name="description">`、`<link rel="canonical">`
- Open Graph：`og:title` / `og:description` / `og:type` / `og:url`
- Twitter card：`summary`
- JSON-LD：
  - 单篇 thought：`BlogPosting`（headline / description / datePublished / dateModified / author / mainEntityOfPage / keywords）
  - 首页：`Person`（name + url）
  - 其余：`WebPage`

注入方式：替换模板中的 `<title>...</title>`，在 `<head>` 内插入 meta 标签，替换 `<!--app-html-->` 为 `appHtml`，并在 `</body>` 前插入 `<script>window.__INITIAL_DATA__ = {...}</script>`。

新增环境变量 `SITE_URL`（默认 dev 用 `http://localhost:3000`，生产设 `https://shiming.dev`），作为 canonical / OG / sitemap 的绝对 URL 基准。参考现有 `.env` / `.env.example` 补齐。

### 4. Express 渲染（server/app.js）

替换现有 SPA fallback `app.get('/{*splat}')` 为显式路由：

```
GET /               → 渲染首页
GET /thoughts       → 渲染列表
GET /thoughts/:id   → 渲染单篇（RESOURCE_NOT_FOUND → 404）
GET /projects       → 渲染列表
GET /projects/:id   → 渲染详情（RESOURCE_NOT_FOUND → 404）
GET /experience     → 渲染
GET /sitemap.xml    → 动态生成
GET /robots.txt     → 静态
其余               → 404
```

中间件顺序保持：`createResourceMiddleware`（API）→ `express.static(staticRoot)` → HTML 路由 → 404。

### 5. sitemap.xml 与 robots.txt

- `robots.txt`：`User-agent: *`，`Disallow: /api/`，`Disallow: /agents`，`Sitemap: https://shiming.dev/sitemap.xml`。
- `sitemap.xml`：动态路由，枚举所有静态页 + 每篇 thought + 每个 project，输出 canonical URL 与 `lastmod`（thought 用 `date`，project 用 `updated_at`，静态页用固定值或省略）。实时读 `home/`，内容始终最新。

### 6. 清理 prerender

移除 `server/prerender.js` 与 `entry-server.tsx` 的 `getRoutes()`。`package.json` 的 `build` 脚本去掉 `prerender` 步骤（保留 `build:client` + `build:server`）。`dist/static/index.html` 仍由 `vite build` 产出，作为服务端 HTML 模板。

### 7. 错误处理与安全

- 不存在的 thought/project id → 渲染 404 页 + HTTP 404。
- `PORTFOLIO_HOME` 未配置或目录缺失 → 页面降级为「空/错误态」，不 crash。
- `__INITIAL_DATA__` 序列化时需转义 `<` 字符（用 `JSON.stringify` 后 `replace(/</g, '\\u003c')`），防止 markdown 代码块含 `</script>` 破坏页面。

## 环境与构建变更

- `.env.example` 增加 `SITE_URL`（与现有 `PORTFOLIO_HOME` 并列）。
- `package.json`：
  - `build` 去掉 `prerender`（保留 `build:client` + `build:server`）。
  - `start` 保持 `node dist/server/index.js`。
- `server/index.js` 的 `createApp` 需传入 `siteUrl`（从 `process.env.SITE_URL` 读取）。

## 测试计划

- `server/route-data.test.js`：URL → data + meta 映射正确；未知 id 抛 `RESOURCE_NOT_FOUND`。
- `server/build-html.test.js`：title/description/canonical/OG/JSON-LD 均注入；`__INITIAL_DATA__` 的 `<` 被转义。
- `server/app.test.js`（扩展现有）：`GET /thoughts/:id` 返回 200 + 正文 + 正确 title；未知 id 返回 404；`GET /sitemap.xml` 返回有效 XML；`GET /robots.txt` 返回正确内容。
- `src/hooks/useAsyncResource.test.tsx`：有服务端数据时初始 `ready` 且不发请求；无数据时照常 fetch。

## 涉及文件

- 新增：`server/route-data.js`、`server/build-html.js`、`src/data/ResourceContext.tsx`
- 修改：`server/app.js`、`server/index.js`、`src/entry-server.tsx`、`src/main.tsx`、`src/hooks/useAsyncResource.ts`、`src/pages/*.tsx`（传 key）、`.env.example`、`package.json`
- 移除：`server/prerender.js`（及 `entry-server.tsx` 的 `getRoutes`）

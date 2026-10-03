import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

const RESOURCE_PREFIX = '/api/v1/resources/';
const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);
const PROJECT_FILES_MARKER = 'files';
const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.markdown', 'text/markdown; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
]);

export async function loadThoughts(portfolioHome) {
  const thoughtsRoot = path.join(portfolioHome, 'thoughts');
  const entries = await readDirectoryOrEmpty(thoughtsRoot);
  const thoughts = [];

  for (const entry of entries) {
    if (!entry.isFile() || !MARKDOWN_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }

    const filePath = path.join(thoughtsRoot, entry.name);
    const document = await readMarkdownDocument(filePath);
    const thought = {
      id: path.basename(entry.name, path.extname(entry.name)),
      title: document.frontmatter.title ?? '',
      tags: parseList(document.frontmatter.tags ?? document.frontmatter.labels),
      categories: parseList(document.frontmatter.categories),
      date: parseDate(document.frontmatter.date, (await fs.stat(filePath)).mtimeMs),
      brief: document.frontmatter.brief ?? document.frontmatter.summary ?? '',
    };
    const lang = normalizeLanguage(document.frontmatter.lang);
    if (lang) {
      thought.lang = lang;
    }
    thoughts.push(thought);
  }

  return thoughts.sort((left, right) => right.date - left.date || left.id.localeCompare(right.id));
}

export async function loadThought(portfolioHome, id) {
  assertSafeResourceId(id);
  const thoughtsRoot = path.join(portfolioHome, 'thoughts');

  for (const extension of MARKDOWN_EXTENSIONS) {
    const filePath = path.join(thoughtsRoot, `${id}${extension}`);
    try {
      return (await readMarkdownDocument(filePath)).body;
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  throw resourceError('RESOURCE_NOT_FOUND', `Thought not found: ${id}`);
}

export async function loadProjects(portfolioHome) {
  const projectsRoot = path.join(portfolioHome, 'projects');
  const entries = await readDirectoryOrEmpty(projectsRoot);
  const projects = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    try {
      const project = await readProject(projectsRoot, entry.name, { includeBodies: false });
      projects.push({
        project,
        latestMtime: await findLatestProjectFileMtime(path.join(projectsRoot, entry.name)),
      });
    } catch (error) {
      if (error?.code !== 'ENOENT' && error?.code !== 'RESOURCE_NOT_FOUND') {
        throw error;
      }
    }
  }

  return projects
    .sort((left, right) => right.latestMtime - left.latestMtime || left.project.project_id.localeCompare(right.project.project_id))
    .map(({ project }) => project);
}

export async function loadProject(portfolioHome, projectId) {
  assertSafeResourceId(projectId);
  return readProject(path.join(portfolioHome, 'projects'), projectId, { includeBodies: true });
}

export async function loadProjectAsset(portfolioHome, projectId, relativePath) {
  assertSafeResourceId(projectId);
  validateProjectRelativePath(relativePath);
  const projectRoot = await resolveProjectDirectory(path.join(portfolioHome, 'projects'), projectId);
  const assetPath = resolveProjectPath(projectRoot, relativePath);

  let realProjectRoot;
  let realAssetPath;
  try {
    [realProjectRoot, realAssetPath] = await Promise.all([
      fs.realpath(projectRoot),
      fs.realpath(assetPath),
    ]);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw resourceError('RESOURCE_NOT_FOUND', `Project asset not found: ${relativePath}`);
    }
    throw error;
  }

  if (!isPathInside(realProjectRoot, realAssetPath)) {
    throw resourceError('INVALID_RESOURCE_PATH', 'Project asset escapes the project directory');
  }

  const stat = await fs.stat(realAssetPath);
  if (!stat.isFile()) {
    throw resourceError('RESOURCE_NOT_FOUND', `Project asset not found: ${relativePath}`);
  }

  return {
    body: await fs.readFile(realAssetPath),
    contentType: contentTypeFor(realAssetPath),
  };
}

export async function loadExperiences(portfolioHome) {
  const experiencesPath = await findFirstExistingFile(portfolioHome, [
    'experiences.yml',
    'experiences.yaml',
  ]);
  if (!experiencesPath) {
    return { workHistory: [], milestones: [] };
  }

  const resource = parseYaml(await fs.readFile(experiencesPath, 'utf8')) ?? {};

  if (Array.isArray(resource)) {
    return { workHistory: resource.map(normalizeExperience), milestones: [] };
  }

  const workHistory = resource?.work_history ?? resource?.workHistory ?? resource?.experiences ?? [];
  const milestones = resource?.milestones ?? [];

  return {
    workHistory: Array.isArray(workHistory) ? workHistory.map(normalizeExperience) : [],
    milestones: Array.isArray(milestones) ? milestones.map(normalizeMilestone) : [],
  };
}

export function createResourceMiddleware(portfolioHome) {
  return async function portfolioResourceMiddleware(request, response, next) {
    const requestUrl = new URL(request.url ?? '/', 'http://portfolio.local');
    if (request.method !== 'GET' || !requestUrl.pathname.startsWith(RESOURCE_PREFIX)) {
      next();
      return;
    }

    if (!portfolioHome) {
      sendJson(response, 500, { error: 'portfolio_home_not_configured' });
      return;
    }

    try {
      const resource = await loadResource(portfolioHome, requestUrl.pathname);
      if (!resource) {
        next();
        return;
      }
      sendResponse(response, 200, resource.contentType, resource.body);
    } catch (error) {
      const status = error?.code === 'INVALID_RESOURCE_PATH'
        ? 400
        : error?.code === 'RESOURCE_NOT_FOUND'
          ? 404
          : 500;
      sendJson(response, status, { error: error?.code ?? 'resource_read_failed' });
    }
  };
}

async function loadResource(portfolioHome, pathname) {
  if (pathname === `${RESOURCE_PREFIX}thoughts`) {
    return jsonResource(await loadThoughts(portfolioHome));
  }
  if (pathname === `${RESOURCE_PREFIX}projects`) {
    return jsonResource(await loadProjects(portfolioHome));
  }
  if (pathname === `${RESOURCE_PREFIX}experiences`) {
    return jsonResource(await loadExperiences(portfolioHome));
  }

  const thoughtPrefix = `${RESOURCE_PREFIX}thoughts/`;
  if (pathname.startsWith(thoughtPrefix)) {
    const encodedId = pathname.slice(thoughtPrefix.length);
    if (!encodedId || encodedId.includes('/')) {
      throw resourceError('INVALID_RESOURCE_PATH', 'Invalid thought id');
    }
    const id = decodeURIComponent(encodedId);
    return textResource(await loadThought(portfolioHome, id), 'text/markdown; charset=utf-8');
  }

  const projectPrefix = `${RESOURCE_PREFIX}projects/`;
  if (pathname.startsWith(projectPrefix)) {
    const segments = pathname
      .slice(projectPrefix.length)
      .split('/')
      .filter(Boolean)
      .map(decodeResourceSegment);
    const [projectId, marker, ...fileSegments] = segments;

    if (!projectId || !marker) {
      return jsonResource(await loadProject(portfolioHome, projectId));
    }
    if (marker !== PROJECT_FILES_MARKER || fileSegments.length === 0) {
      throw resourceError('INVALID_RESOURCE_PATH', 'Invalid project resource path');
    }

    return loadProjectAsset(portfolioHome, projectId, fileSegments.join('/'));
  }

  return null;
}

async function readProject(projectsRoot, projectId, { includeBodies }) {
  const projectRoot = await resolveProjectDirectory(projectsRoot, projectId);
  const readmePath = path.join(projectRoot, 'README.md');

  let readme;
  try {
    readme = await readMarkdownDocument(readmePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw resourceError('RESOURCE_NOT_FOUND', `Project README not found: ${projectId}`);
    }
    throw error;
  }

  const documents = [];
  for (const filePath of await findProjectMarkdownFiles(projectRoot)) {
    const relativePath = toPortablePath(path.relative(projectRoot, filePath));
    const document = await readMarkdownDocument(filePath);
    const summary = normalizeProjectDocument(document.frontmatter, relativePath);
    documents.push(includeBodies ? { ...summary, body: document.body } : summary);
  }

  documents.sort((left, right) => left.path.localeCompare(right.path));

  const project = {
    ...normalizeProjectFrontmatter(readme.frontmatter, projectId),
    documents,
  };
  if (includeBodies) {
    project.body = readme.body;
  }
  return project;
}

async function resolveProjectDirectory(projectsRoot, projectId) {
  assertSafeResourceId(projectId);
  const projectRoot = path.join(projectsRoot, projectId);

  try {
    const stat = await fs.stat(projectRoot);
    if (!stat.isDirectory()) {
      throw resourceError('RESOURCE_NOT_FOUND', `Project not found: ${projectId}`);
    }
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw resourceError('RESOURCE_NOT_FOUND', `Project not found: ${projectId}`);
    }
    throw error;
  }

  let realProjectsRoot;
  let realProjectRoot;
  try {
    [realProjectsRoot, realProjectRoot] = await Promise.all([
      fs.realpath(projectsRoot),
      fs.realpath(projectRoot),
    ]);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw resourceError('RESOURCE_NOT_FOUND', `Project not found: ${projectId}`);
    }
    throw error;
  }
  if (!isPathInside(realProjectsRoot, realProjectRoot)) {
    throw resourceError('INVALID_RESOURCE_PATH', 'Project escapes the projects directory');
  }

  return projectRoot;
}

async function findLatestProjectFileMtime(projectRoot) {
  const files = await findProjectFiles(projectRoot);
  if (files.length === 0) {
    return 0;
  }

  const stats = await Promise.all(files.map((filePath) => fs.stat(filePath)));
  return Math.max(...stats.map((stat) => stat.mtimeMs));
}

async function findProjectFiles(projectRoot, currentDirectory = projectRoot) {
  const entries = await fs.readdir(currentDirectory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    const filePath = path.join(currentDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findProjectFiles(projectRoot, filePath));
      continue;
    }

    if (entry.isFile()) {
      files.push(filePath);
    }
  }

  return files;
}

async function findProjectMarkdownFiles(projectRoot) {
  const files = await findProjectFiles(projectRoot);
  return files.filter((filePath) => (
    toPortablePath(path.relative(projectRoot, filePath)) !== 'README.md'
    && MARKDOWN_EXTENSIONS.has(path.extname(filePath).toLowerCase())
  ));
}

function normalizeProjectFrontmatter(frontmatter, projectId) {
  return {
    project_id: projectId,
    project_name: stringValue(frontmatter.project_name ?? frontmatter.title),
    start_date: stringValue(frontmatter.start_date ?? frontmatter.date),
    end_date: stringValue(frontmatter.end_date),
    brief: stringValue(frontmatter.brief ?? frontmatter.summary),
    tags: parseList(frontmatter.tags ?? frontmatter.labels),
    categories: parseList(frontmatter.categories),
    status: stringValue(frontmatter.status),
    featured: parseBoolean(frontmatter.featured),
  };
}

function normalizeProjectDocument(frontmatter, relativePath) {
  return {
    path: relativePath,
    title: stringValue(frontmatter.title ?? frontmatter.project_name ?? path.basename(relativePath, path.extname(relativePath))),
    brief: stringValue(frontmatter.brief ?? frontmatter.summary),
    tags: parseList(frontmatter.tags ?? frontmatter.labels),
    categories: parseList(frontmatter.categories),
  };
}

function resolveProjectPath(projectRoot, relativePath) {
  validateProjectRelativePath(relativePath);

  const assetPath = path.resolve(projectRoot, relativePath);
  if (!isPathInside(projectRoot, assetPath)) {
    throw resourceError('INVALID_RESOURCE_PATH', 'Project asset escapes the project directory');
  }
  return assetPath;
}

function validateProjectRelativePath(relativePath) {
  if (
    typeof relativePath !== 'string'
    || !relativePath
    || relativePath.includes('\0')
    || relativePath.includes('\\')
    || path.isAbsolute(relativePath)
    || relativePath.split('/').includes('..')
  ) {
    throw resourceError('INVALID_RESOURCE_PATH', 'Invalid project asset path');
  }
}

function isPathInside(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function toPortablePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function contentTypeFor(filePath) {
  return CONTENT_TYPES.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream';
}

function stringValue(value) {
  return value == null ? '' : String(value);
}

function parseBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.trim().toLowerCase() === 'true';
  }
  return false;
}

function normalizeLanguage(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function decodeResourceSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    throw resourceError('INVALID_RESOURCE_PATH', 'Invalid encoded resource path');
  }
}

async function readMarkdownDocument(filePath) {
  const source = await fs.readFile(filePath, 'utf8');
  return splitFrontmatter(source);
}

async function readDirectoryOrEmpty(directory) {
  try {
    return await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function findFirstExistingFile(root, relativePaths) {
  for (const relativePath of relativePaths) {
    const filePath = path.join(root, relativePath);
    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        return filePath;
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }
  return null;
}

function splitFrontmatter(source) {
  const lines = source.split(/\r?\n/);
  if (lines[0] !== '---') {
    return { frontmatter: {}, body: source };
  }

  const closingIndex = lines.slice(1).findIndex((line) => line === '---') + 1;
  if (closingIndex === 0) {
    return { frontmatter: {}, body: source };
  }

  return {
    frontmatter: parseFrontmatter(lines.slice(1, closingIndex)),
    body: lines.slice(closingIndex + 1).join('\n').replace(/^\n/, ''),
  };
}

function parseFrontmatter(lines) {
  const fields = {};
  let currentListKey = null;
  let currentListValues = [];

  const flushList = () => {
    if (currentListKey) {
      fields[currentListKey] = currentListValues;
      currentListKey = null;
      currentListValues = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const listItem = trimmed.match(/^-\s+(.+)$/);
    if (listItem && currentListKey) {
      currentListValues.push(unquote(listItem[1].trim()));
      continue;
    }

    const field = trimmed.match(/^([\w-]+):(?:\s*(.*))?$/);
    if (!field) {
      continue;
    }

    flushList();
    const [, key, rawValue = ''] = field;
    if (!rawValue) {
      currentListKey = key;
      continue;
    }
    fields[key] = unquote(rawValue.trim());
  }

  flushList();
  return fields;
}

function parseList(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return [];
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return trimmed ? [trimmed] : [];
  }
  return trimmed
    .slice(1, -1)
    .split(',')
    .map((item) => unquote(item.trim()))
    .filter(Boolean);
}

function parseDate(value, fallbackMilliseconds) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value > 1_000_000_000_000 ? value / 1000 : value);
  }
  if (typeof value === 'string' && value.trim()) {
    if (/^\d+(?:\.\d+)?$/.test(value.trim())) {
      return parseDate(Number(value), fallbackMilliseconds);
    }
    const milliseconds = Date.parse(value);
    if (Number.isFinite(milliseconds)) {
      return Math.floor(milliseconds / 1000);
    }
  }
  return Math.floor(fallbackMilliseconds / 1000);
}

function normalizeExperience(entry = {}) {
  return {
    role: entry.role ?? entry.title ?? '',
    company: entry.company ?? entry.organization ?? '',
    period: entry.period ?? entry.date ?? '',
    highlights: Array.isArray(entry.highlights) ? entry.highlights : [],
  };
}

function normalizeMilestone(entry = {}) {
  return {
    year: String(entry.year ?? entry.date ?? ''),
    brief: entry.brief ?? entry.description ?? entry.title ?? '',
  };
}

function assertSafeResourceId(id) {
  if (!id || id.includes('/') || id.includes('\\') || id === '.' || id === '..') {
    throw resourceError('INVALID_RESOURCE_PATH', 'Invalid resource id');
  }
}

function unquote(value) {
  return value
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

function resourceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function jsonResource(value) {
  return textResource(JSON.stringify(value), 'application/json; charset=utf-8');
}

function textResource(body, contentType) {
  return { body, contentType };
}

function sendResponse(response, status, contentType, body) {
  response.statusCode = status;
  response.setHeader('content-type', contentType);
  response.end(body);
}

function sendJson(response, status, body) {
  sendResponse(response, status, 'application/json; charset=utf-8', JSON.stringify(body));
}

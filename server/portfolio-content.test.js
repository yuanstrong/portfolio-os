import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

import {
  createResourceMiddleware,
  loadExperiences,
  loadProject,
  loadProjectAsset,
  loadProjects,
  loadThought,
  loadThoughts,
} from './portfolio-content.js';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

test('loads thought summaries and strips frontmatter from the detail body', async () => {
  const home = await makePortfolioHome();
  await fs.mkdir(path.join(home, 'thoughts'));
  await fs.writeFile(
    path.join(home, 'thoughts/zero-depth.md'),
    [
      '---',
      'title: Zero Depth',
      'tags: [ui, accessibility]',
      'categories:',
      '  - interface',
      'summary: Interfaces without shadows',
      'date: 2026-09-23',
      'lang: zh',
      '---',
      '',
      '# Zero Depth',
      '',
      'Body',
    ].join('\n'),
  );

  const thoughts = await loadThoughts(home);
  const thought = await loadThought(home, 'zero-depth');

  assert.deepEqual(thoughts, [
    {
      id: 'zero-depth',
      title: 'Zero Depth',
      tags: ['ui', 'accessibility'],
      categories: ['interface'],
      date: Math.floor(Date.parse('2026-09-23') / 1000),
      brief: 'Interfaces without shadows',
      lang: 'zh',
    },
  ]);
  assert.equal(thought, '# Zero Depth\n\nBody');
});

test('returns empty optional resources when their files or directories are absent', async () => {
  const home = await makePortfolioHome();

  assert.deepEqual(await loadThoughts(home), []);
  assert.deepEqual(await loadProjects(home), []);
  assert.deepEqual(await loadExperiences(home), { workHistory: [], milestones: [] });
});

test('loads human-readable experience entries from experiences.yml', async () => {
  const home = await makePortfolioHome();
  await fs.writeFile(
    path.join(home, 'experiences.yml'),
    [
      'work_history:',
      '  - role: Staff Engineer',
      '    company: AgentOS',
      '    period: 2024 - present',
      '    highlights:',
      '      - Built the local content platform',
      '      - Led the reliability program',
      'milestones:',
      '  - year: 2024',
      '    brief: Started building Jarvis',
    ].join('\n'),
  );

  assert.deepEqual(await loadExperiences(home), {
    workHistory: [
      {
        role: 'Staff Engineer',
        company: 'AgentOS',
        period: '2024 - present',
        highlights: ['Built the local content platform', 'Led the reliability program'],
      },
    ],
    milestones: [{ year: '2024', brief: 'Started building Jarvis' }],
  });
});

test('loads project metadata, supporting markdown documents, and static assets', async () => {
  const home = await makePortfolioHome();
  const projectRoot = path.join(home, 'projects', 'jarvis');
  await fs.mkdir(path.join(projectRoot, 'assets'), { recursive: true });
  await fs.writeFile(
    path.join(projectRoot, 'README.md'),
    [
      '---',
      'title: Jarvis',
      'brief: A local agent runtime',
      'start_date: 2026-01-01',
      'tags: [agents, runtime]',
      'categories:',
      '  - systems',
      'status: active',
      '---',
      '',
      '# Jarvis',
      '',
      'Read the [architecture](architect.md).',
      '',
      '```mermaid',
      'flowchart LR',
      '  User --> Jarvis',
      '```',
    ].join('\n'),
  );
  await fs.writeFile(
    path.join(projectRoot, 'architect.md'),
    [
      '---',
      'title: Architecture',
      'brief: The runtime boundaries',
      'tags: [architecture]',
      '---',
      '',
      '# Architecture',
      '',
      'A local-first tool loop.',
    ].join('\n'),
  );
  await fs.writeFile(path.join(projectRoot, 'assets', 'topology.svg'), '<svg />');

  assert.deepEqual(await loadProjects(home), [
    {
      project_id: 'jarvis',
      project_name: 'Jarvis',
      start_date: '2026-01-01',
      end_date: '',
      brief: 'A local agent runtime',
      tags: ['agents', 'runtime'],
      categories: ['systems'],
      status: 'active',
      featured: false,
      documents: [
        {
          path: 'architect.md',
          title: 'Architecture',
          brief: 'The runtime boundaries',
          tags: ['architecture'],
          categories: [],
        },
      ],
    },
  ]);

  assert.deepEqual(await loadProject(home, 'jarvis'), {
    project_id: 'jarvis',
    project_name: 'Jarvis',
    start_date: '2026-01-01',
    end_date: '',
    brief: 'A local agent runtime',
    tags: ['agents', 'runtime'],
    categories: ['systems'],
    status: 'active',
    featured: false,
    body: '# Jarvis\n\nRead the [architecture](architect.md).\n\n```mermaid\nflowchart LR\n  User --> Jarvis\n```',
    documents: [
      {
        path: 'architect.md',
        title: 'Architecture',
        brief: 'The runtime boundaries',
        tags: ['architecture'],
        categories: [],
        body: '# Architecture\n\nA local-first tool loop.',
      },
    ],
  });

  const asset = await loadProjectAsset(home, 'jarvis', 'assets/topology.svg');
  assert.equal(asset.contentType, 'image/svg+xml');
  assert.equal(asset.body.toString(), '<svg />');
});

test('sorts projects by the newest file modification time, including nested files', async () => {
  const home = await makePortfolioHome();
  const olderProject = path.join(home, 'projects', 'older');
  const newerProject = path.join(home, 'projects', 'newer');
  await fs.mkdir(path.join(olderProject, 'docs'), { recursive: true });
  await fs.mkdir(newerProject, { recursive: true });
  await fs.writeFile(path.join(olderProject, 'README.md'), '---\ntitle: Older\n---\n');
  await fs.writeFile(path.join(olderProject, 'docs', 'notes.md'), 'Updated later');
  await fs.writeFile(path.join(newerProject, 'README.md'), '---\ntitle: Newer\n---\n');

  await fs.utimes(path.join(olderProject, 'README.md'), new Date('2026-01-01'), new Date('2026-01-01'));
  await fs.utimes(path.join(olderProject, 'docs', 'notes.md'), new Date('2026-01-03'), new Date('2026-01-03'));
  await fs.utimes(path.join(newerProject, 'README.md'), new Date('2026-01-02'), new Date('2026-01-02'));

  assert.deepEqual(
    (await loadProjects(home)).map((project) => project.project_id),
    ['older', 'newer'],
  );
});

test('rejects project paths that escape the portfolio home', async () => {
  const home = await makePortfolioHome();

  await assert.rejects(
    () => loadProject(home, '../secrets'),
    (error) => error?.code === 'INVALID_RESOURCE_PATH',
  );
  await assert.rejects(
    () => loadProjectAsset(home, 'jarvis', '../secrets.txt'),
    (error) => error?.code === 'INVALID_RESOURCE_PATH',
  );
});

test('serves project details and project assets through resource endpoints', async () => {
  const home = await makePortfolioHome();
  const projectRoot = path.join(home, 'projects', 'jarvis');
  await fs.mkdir(path.join(projectRoot, 'assets'), { recursive: true });
  await fs.writeFile(
    path.join(projectRoot, 'README.md'),
    ['---', 'title: Jarvis', '---', '', '# Jarvis'].join('\n'),
  );
  await fs.writeFile(path.join(projectRoot, 'assets', 'diagram.svg'), '<svg />');

  const middleware = createResourceMiddleware(home);
  const detail = await callMiddleware(middleware, '/api/v1/resources/projects/jarvis');
  const asset = await callMiddleware(middleware, '/api/v1/resources/projects/jarvis/files/assets/diagram.svg');

  assert.equal(detail.statusCode, 200);
  assert.equal(JSON.parse(detail.body).body, '# Jarvis');
  assert.equal(asset.statusCode, 200);
  assert.equal(asset.contentType, 'image/svg+xml');
  assert.equal(asset.body.toString(), '<svg />');
});

test('keeps top-level experience lists compatible with the previous JSON shape', async () => {
  const home = await makePortfolioHome();
  await fs.writeFile(
    path.join(home, 'experiences.yml'),
    [
      '- role: Engineer',
      '  company: SAP',
      '  period: 2022 - 2024',
    ].join('\n'),
  );

  assert.deepEqual(await loadExperiences(home), {
    workHistory: [{ role: 'Engineer', company: 'SAP', period: '2022 - 2024', highlights: [] }],
    milestones: [],
  });
});

test('rejects thought ids that escape the portfolio home', async () => {
  const home = await makePortfolioHome();

  await assert.rejects(
    () => loadThought(home, '../secrets'),
    (error) => error?.code === 'INVALID_RESOURCE_PATH',
  );
});

async function makePortfolioHome() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-home-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function callMiddleware(middleware, url) {
  const result = {
    statusCode: 200,
    contentType: '',
    body: '',
  };
  const response = {
    setHeader(name, value) {
      if (name === 'content-type') {
        result.contentType = value;
      }
    },
    end(body) {
      result.body = body;
    },
  };

  await middleware({ method: 'GET', url }, response, () => {});
  return result;
}

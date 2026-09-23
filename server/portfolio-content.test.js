import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

import {
  loadExperiences,
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

import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  fetchExperiences,
  fetchProject,
  fetchProjects,
  fetchThought,
  fetchThoughts,
  formatResourceDate,
  normalizeExperiences,
} from './resources';
import { getThoughtBodyClassName } from '../pages/BlogPost';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('fetchThoughts loads the resources thoughts endpoint', async () => {
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    requests.push(String(input));
    return Response.json([
      {
        id: 'zero depth',
        title: 'Zero Depth',
        tags: ['ui'],
        categories: ['interface'],
        date: 1_775_000_000,
        brief: 'Interfaces without shadows',
        lang: 'zh',
      },
    ]);
  };

  const thoughts = await fetchThoughts();

  assert.deepEqual(requests, ['/api/v1/resources/thoughts']);
  assert.equal(thoughts[0].id, 'zero depth');
  assert.deepEqual(thoughts[0].tags, ['ui']);
  assert.deepEqual(thoughts[0].categories, ['interface']);
  assert.equal(thoughts[0].lang, 'zh');
});

test('fetchThought encodes ids before loading markdown body', async () => {
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    requests.push(String(input));
    return new Response('# Zero Depth');
  };

  const thought = await fetchThought('zero depth');

  assert.deepEqual(requests, ['/api/v1/resources/thoughts/zero%20depth']);
  assert.equal(thought, '# Zero Depth');
});

test('fetchProjects and fetchExperiences load their resource endpoints', async () => {
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    requests.push(String(input));
    if (String(input).endsWith('/projects')) {
      return Response.json([
        {
          project_name: 'Jarvis',
          project_id: 'Jarvis',
          start_date: 'fixture-start-date',
          brief: 'Local agent runtime',
        },
      ]);
    }
    return Response.json({
      work_history: [{ role: 'Engineer', company: 'AgentOS', period: '2026' }],
      milestones: [{ year: '2026', brief: 'Started Jarvis' }],
    });
  };

  const projects = await fetchProjects();
  const experiences = await fetchExperiences();

  assert.deepEqual(requests, [
    '/api/v1/resources/projects',
    '/api/v1/resources/experiences',
  ]);
  assert.equal(projects[0].project_name, 'Jarvis');
  assert.equal(experiences.workHistory[0].role, 'Engineer');
  assert.equal(experiences.milestones[0].brief, 'Started Jarvis');
});

test('fetchProject encodes project ids before loading project details', async () => {
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    requests.push(String(input));
    return Response.json({
      project_id: 'jarvis lab',
      project_name: 'Jarvis Lab',
      start_date: 'fixture-detail-start-date',
      brief: 'A local agent runtime',
      tags: ['agents'],
      categories: [],
      status: 'active',
      featured: false,
      body: '# Jarvis Lab',
      documents: [],
    });
  };

  const project = await fetchProject('jarvis lab');

  assert.deepEqual(requests, ['/api/v1/resources/projects/jarvis%20lab']);
  assert.equal(project.project_name, 'Jarvis Lab');
  assert.deepEqual(project.tags, ['agents']);
});

test('normalizeExperiences accepts both array and object resources', () => {
  assert.deepEqual(
    normalizeExperiences([{ title: 'Builder', organization: 'Lab', period: '2025' }])
      .workHistory[0],
    {
      role: 'Builder',
      company: 'Lab',
      period: '2025',
      highlights: [],
    },
  );
});

test('formatResourceDate converts unix seconds to an ISO date label', () => {
  assert.equal(formatResourceDate(0), '1970-01-01');
});

test('maps thought languages to scoped body presentation classes', () => {
  assert.equal(getThoughtBodyClassName('zh'), 'thought-body thought-body--zh');
  assert.equal(getThoughtBodyClassName('zh-Hans'), 'thought-body thought-body--zh');
  assert.equal(getThoughtBodyClassName('en'), 'thought-body thought-body--en');
  assert.equal(getThoughtBodyClassName(''), 'thought-body');
});

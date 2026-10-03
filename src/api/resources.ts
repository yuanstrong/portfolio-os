export type ThoughtSummary = {
  id: string;
  title: string;
  tags: string[];
  categories: string[];
  date: number;
  brief: string;
  lang?: string;
};

export type ProjectSummary = {
  project_name: string;
  project_id: string;
  start_date: string;
  end_date: string;
  updated_at: string;
  brief: string;
  tags: string[];
  categories: string[];
  status: string;
  featured: boolean;
  documents: ProjectDocument[];
};

export type ProjectDocument = {
  path: string;
  title: string;
  brief: string;
  tags: string[];
  categories: string[];
};

export type ProjectDetails = Omit<ProjectSummary, 'documents'> & {
  body: string;
  documents: Array<ProjectDocument & { body: string }>;
};

export type ExperienceEntry = {
  role: string;
  company: string;
  period: string;
  highlights: string[];
};

export type MilestoneEntry = {
  year: string;
  brief: string;
};

export type ExperienceResource = {
  workHistory: ExperienceEntry[];
  milestones: MilestoneEntry[];
};

type RawExperienceEntry = {
  role?: string;
  title?: string;
  company?: string;
  organization?: string;
  period?: string;
  date?: string;
  highlights?: string[];
};

type RawMilestoneEntry = {
  year?: string | number;
  date?: string;
  brief?: string;
  title?: string;
  description?: string;
};

type RawExperienceResource =
  | RawExperienceEntry[]
  | {
      work_history?: RawExperienceEntry[];
      workHistory?: RawExperienceEntry[];
      experiences?: RawExperienceEntry[];
      milestones?: RawMilestoneEntry[];
    };

export async function fetchThoughts(): Promise<ThoughtSummary[]> {
  return fetchJson<ThoughtSummary[]>('/api/v1/resources/thoughts');
}

export async function fetchThought(id: string): Promise<string> {
  return fetchText(`/api/v1/resources/thoughts/${encodeURIComponent(id)}`);
}

export async function fetchProjects(): Promise<ProjectSummary[]> {
  return fetchJson<ProjectSummary[]>('/api/v1/resources/projects');
}

export async function fetchProject(id: string): Promise<ProjectDetails> {
  return fetchJson<ProjectDetails>(`/api/v1/resources/projects/${encodeURIComponent(id)}`);
}

export async function fetchExperiences(): Promise<ExperienceResource> {
  return normalizeExperiences(
    await fetchJson<RawExperienceResource>('/api/v1/resources/experiences'),
  );
}

export function normalizeExperiences(resource: RawExperienceResource): ExperienceResource {
  if (Array.isArray(resource)) {
    return {
      workHistory: resource.map(normalizeExperienceEntry),
      milestones: [],
    };
  }

  const workHistory =
    resource.work_history ?? resource.workHistory ?? resource.experiences ?? [];

  return {
    workHistory: workHistory.map(normalizeExperienceEntry),
    milestones: (resource.milestones ?? []).map(normalizeMilestoneEntry),
  };
}

export function formatResourceDate(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${url} failed with HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${url} failed with HTTP ${response.status}`);
  }
  return response.text();
}

function normalizeExperienceEntry(entry: RawExperienceEntry): ExperienceEntry {
  return {
    role: entry.role ?? entry.title ?? '',
    company: entry.company ?? entry.organization ?? '',
    period: entry.period ?? entry.date ?? '',
    highlights: entry.highlights ?? [],
  };
}

function normalizeMilestoneEntry(entry: RawMilestoneEntry): MilestoneEntry {
  return {
    year: String(entry.year ?? entry.date ?? ''),
    brief: entry.brief ?? entry.description ?? entry.title ?? '',
  };
}

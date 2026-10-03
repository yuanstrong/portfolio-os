# Portfolio

This portfolio reads published content from a local directory configured by
`PORTFOLIO_HOME`.

Create a `.env` file in the project root:

```env
PORTFOLIO_HOME=/absolute/path/to/portfolio-home
```

Relative paths are resolved from the project root. The content directory uses
this layout:

```text
PORTFOLIO_HOME/
├── thoughts/
│   ├── first-thought.md
│   └── ...
├── projects/
│   └── project-id/
│       ├── README.md
│       ├── architect.md
│       └── assets/
│           └── diagram.svg
└── experiences.yml
```

The experience file follows
[schemas/experiences.schema.json](schemas/experiences.schema.json). A typical
file looks like this:

```yaml
work_history:
  - role: Staff Engineer
    company: AgentOS
    period: 2024 - present
    highlights:
      - Built the local content platform
      - Led the reliability program

milestones:
  - year: 2024
    brief: Started building Jarvis
```

Each directory under `projects/` is one project. Its `README.md` supplies the
project summary and detail page. Additional Markdown files, images, SVGs, and
other assets can live beside it; relative Markdown links are resolved within
the project. Project frontmatter follows
[schemas/projects.schema.json](schemas/projects.schema.json), and supports
fields such as `title`, `brief`, `start_date`, `status`, `tags`,
`categories`, and `featured`.
Projects are listed by the `updated_at` value in each project's `README.md`
frontmatter. Use an ISO date or another value that JavaScript can parse as a
date. Project IDs are used as the stable tie-breaker when `updated_at` values
are equal or absent.

Thought files support frontmatter fields such as `title`, `tags`,
`categories`, `date`, `lang`, and `brief` (or `summary`). Set `lang: zh` (or
another `zh-*` locale) to add a two-character first-line indent to direct
Chinese paragraphs. Set `lang: en` (or another `en-*` locale) to add a drop cap
to the first letter of the opening paragraph. Other languages keep the default
paragraph styling. The Markdown after the frontmatter is rendered as the
thought body.

Run the development server with `pnpm dev`.

To produce a self-contained production artifact, run:

```bash
pnpm run package:artifact
```

This creates a `dist/` directory containing the static site, the compiled Node
server, `package.json`, and production-only dependencies. Start that artifact
with:

```bash
PORTFOLIO_HOME=/absolute/path/to/portfolio-home node dist/server/index.js
```

`PORTFOLIO_HOME` remains an external content directory and is not copied into
the artifact. The old `scripts/` directory is now `server/`; its source files
are used during development and build time, while production runs only the
compiled files under `dist/server/`.

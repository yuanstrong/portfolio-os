import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(serverRoot, '..');
const artifactRoot = path.join(projectRoot, 'dist');
const rootPackage = JSON.parse(
  await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8'),
);

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
const runtimeDependencies = Object.fromEntries(
  runtimeDependencyNames.map((name) => {
    const version = rootPackage.dependencies?.[name];
    if (!version) {
      throw new Error(`Runtime dependency is missing from package.json: ${name}`);
    }
    return [name, version];
  }),
);

await fs.writeFile(
  path.join(artifactRoot, 'package.json'),
  `${JSON.stringify({
    name: `${rootPackage.name}-runtime`,
    private: true,
    type: 'module',
    engines: rootPackage.engines,
    dependencies: runtimeDependencies,
  }, null, 2)}\n`,
);

console.log('Prepared production runtime package in dist/package.json');

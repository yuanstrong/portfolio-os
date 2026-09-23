import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve relative to project root
const toAbsolute = (p) => path.resolve(__dirname, '..', p);

async function prerender() {
  try {
    // Determine the template
    const templatePath = toAbsolute('dist/static/index.html');
    const template = await fs.readFile(templatePath, 'utf-8');
    
    // Import the compiled server entry point
    const { render, getRoutes } = await import(toAbsolute('dist/server/entry-server.js'));

    const routes = getRoutes();
    
    for (const url of routes) {
      // Server render the React app component for the URL
      const appHtml = render(url);

      // Inject the component into the template
      const html = template.replace(`<!--app-html-->`, appHtml);

      // Write output to the dist/static directory
      let filePath = url === '/' ? 'index.html' : `${url}/index.html`;
      if (filePath.startsWith('/')) {
        filePath = filePath.substring(1);
      }
      
      const absoluteFilePath = toAbsolute(`dist/static/${filePath}`);
      
      // Ensure the directory structure exists
      await fs.mkdir(path.dirname(absoluteFilePath), { recursive: true });
      
      await fs.writeFile(absoluteFilePath, html);
      console.log(`pre-rendered: ${filePath}`);
    }
    
    console.log("SSG setup completed successfully!");
  } catch (error) {
    console.error("Failed to pre-render:", error);
    process.exitCode = 1;
  }
}

prerender();

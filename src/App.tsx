/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Thoughts } from './pages/Thoughts';
import { Experience } from './pages/Experience';
import { Projects } from './pages/Projects';
import { BlogPost } from './pages/BlogPost';
import { AgentsPage } from './pages/Agents';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/thoughts" element={<Thoughts />} />
        <Route path="/thoughts/:id" element={<BlogPost />} />
        <Route path="/experience" element={<Experience />} />
        <Route path="/projects" element={<Projects />} />
      </Route>
      <Route path="/agents" element={<AgentsPage />} />
    </Routes>
  );
}

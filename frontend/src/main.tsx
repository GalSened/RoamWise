/**
 * React Entry Point for AI Planner
 *
 * This file bootstraps the React application with the AIPlanner component.
 * Used when the PWA is loaded in full React mode.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { AIPlanner } from './components/Planner';
import './styles/global.css';

// Mount the React app
const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <AIPlanner />
    </React.StrictMode>
  );
} else {
  console.error('Root element not found. Make sure you have a <div id="root"></div> in your HTML.');
}

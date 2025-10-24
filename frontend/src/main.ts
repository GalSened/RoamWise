import './styles/global.css';

// Simple fallback if TypeScript fails
console.log('TypeScript main.ts loading...');

// Try to load the full app, but provide fallback
let appInitialized = false;

async function initializeMainApp() {
  try {
    const { initializeApp } = await import('./core/app');
    const { telemetry } = await import('./lib/telemetry');
    
    // Initialize telemetry
    telemetry.setProperty('app_version', import.meta.env.VITE_APP_VERSION || '2.0.0');
    telemetry.setProperty('build_env', import.meta.env.MODE);
    
    await initializeApp();
    telemetry.track('app_initialized');
    appInitialized = true;
    
    console.log('✅ Full TypeScript app initialized successfully');
  } catch (error) {
    console.error('❌ TypeScript app initialization failed:', error);
    console.log('🔄 Falling back to simple JavaScript navigation');
    
    // The simple-app.js will handle basic functionality
    if (!appInitialized) {
      document.dispatchEvent(new CustomEvent('fallback-to-simple-app'));
    }
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Starting app initialization...');
  await initializeMainApp();
});
#!/usr/bin/env node
/**
 * Fetch secrets from GCP Secret Manager and set as environment variables
 * This runs before the main app starts
 */

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

async function fetchSecrets() {
  // Only fetch secrets in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('Development mode - using .env file');
    return;
  }

  console.log('Fetching secrets from Secret Manager...');

  const client = new SecretManagerServiceClient();
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'premium-hybrid-473405-g7';

  const secrets = [
    'OPENAI_API_KEY',
    'GOOGLE_MAPS_API_KEY',
    'OPENWEATHER_API_KEY'
  ];

  try {
    for (const secretName of secrets) {
      const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

      try {
        const [version] = await client.accessSecretVersion({ name });
        const secretValue = version.payload.data.toString('utf8');
        process.env[secretName] = secretValue;
        console.log(`✓ Loaded secret: ${secretName}`);
      } catch (error) {
        console.warn(`⚠ Could not load secret ${secretName}:`, error.message);
      }
    }

    console.log('✓ Secrets loaded successfully');
  } catch (error) {
    console.error('Error fetching secrets:', error);
    throw error;
  }
}

// Export for use in server.js
module.exports = fetchSecrets;

// If run directly, fetch and start server
if (require.main === module) {
  fetchSecrets()
    .then(() => {
      console.log('Starting server...');
      require('./server.js');
    })
    .catch(error => {
      console.error('Failed to fetch secrets:', error);
      process.exit(1);
    });
}
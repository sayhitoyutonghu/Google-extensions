#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get environment from command line argument
const env = process.argv[2] || 'dev';
if (!['dev', 'prod'].includes(env)) {
  console.error('Usage: node build-manifest.js [dev|prod]');
  process.exit(1);
}

console.log(`Building manifest.json for ${env} environment...`);

// Read the template
const templatePath = path.join(__dirname, '..', 'manifest.template.json');
const template = fs.readFileSync(templatePath, 'utf8');

// Read environment config
const envPath = path.join(__dirname, '..', `env.${env}.json`);
if (!fs.existsSync(envPath)) {
  console.error(`Environment file not found: ${envPath}`);
  process.exit(1);
}

const envConfig = JSON.parse(fs.readFileSync(envPath, 'utf8'));

if (!envConfig.client_id || envConfig.client_id.includes('YOUR_') || envConfig.client_id.includes('REPLACE_ME')) {
  console.error(`Invalid client_id in ${envPath}. Please set a valid Google OAuth Client ID.`);
  process.exit(1);
}

// Replace placeholders
let manifest = template.replace('__CLIENT_ID__', envConfig.client_id);

// Parse and validate JSON
try {
  const manifestObj = JSON.parse(manifest);
  
  // Add environment-specific modifications
  if (env === 'prod') {
    manifestObj.version = '1.0.0';
    manifestObj.name = 'Job Application Tracker';
  } else {
    manifestObj.version = '0.1.0';
    manifestObj.name = 'Job Application Tracker (Dev)';
  }

  // Write to chrome-extension directory
  const outputPath = path.join(__dirname, '..', 'chrome-extension', 'manifest.json');
  fs.writeFileSync(outputPath, JSON.stringify(manifestObj, null, 2));
  
  console.log(`✅ manifest.json created successfully at ${outputPath}`);
  console.log(`🔑 Using client_id: ${envConfig.client_id}`);
  
} catch (error) {
  console.error('Error parsing manifest JSON:', error);
  process.exit(1);
}
#!/usr/bin/env node

/**
 * Script to publish a deprecation notice for prism-uncertainty
 * This creates a minimal package that shows deprecation warnings
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEMP_DIR = path.join(__dirname, '../temp-deprecation');

// Create temporary directory
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Create package.json for deprecated package
const deprecatedPackage = {
  name: 'prism-uncertainty',
  version: '1.0.22',
  description: 'DEPRECATED - Please use @prism/core instead',
  main: 'index.js',
  scripts: {
    postinstall: 'node deprecation-notice.js'
  },
  keywords: ['deprecated', 'prism', 'uncertainty'],
  repository: {
    type: 'git',
    url: 'https://github.com/uncertainty-lang/prism.git'
  }
};

// Create index.js that throws deprecation warning
const indexContent = `
console.error('\\n\\n⚠️  DEPRECATION WARNING ⚠️');
console.error('=====================================');
console.error('prism-uncertainty has been moved to @prism/core');
console.error('');
console.error('Please update your dependencies:');
console.error('  npm uninstall prism-uncertainty');
console.error('  npm install @prism/core');
console.error('');
console.error('Then update your imports:');
console.error('  OLD: import { parse } from "prism-uncertainty"');
console.error('  NEW: import { parse } from "@prism/core"');
console.error('=====================================\\n\\n');

throw new Error('prism-uncertainty is deprecated. Please install @prism/core instead.');
`;

// Create deprecation notice script
const noticeContent = `
console.log('\\n\\n⚠️  DEPRECATION NOTICE ⚠️');
console.log('=====================================');
console.log('prism-uncertainty has moved to @prism/core');
console.log('');
console.log('Migration instructions:');
console.log('  1. npm uninstall prism-uncertainty');
console.log('  2. npm install @prism/core');
console.log('  3. Update imports from "prism-uncertainty" to "@prism/core"');
console.log('');
console.log('For more info: https://github.com/uncertainty-lang/prism');
console.log('=====================================\\n\\n');
`;

// Create README
const readmeContent = fs.readFileSync(
  path.join(__dirname, '../packages/prism-core/DEPRECATION_README.md'),
  'utf8'
);

// Write files
fs.writeFileSync(path.join(TEMP_DIR, 'package.json'), JSON.stringify(deprecatedPackage, null, 2));
fs.writeFileSync(path.join(TEMP_DIR, 'index.js'), indexContent);
fs.writeFileSync(path.join(TEMP_DIR, 'deprecation-notice.js'), noticeContent);
fs.writeFileSync(path.join(TEMP_DIR, 'README.md'), readmeContent);

console.log('Deprecation package created in:', TEMP_DIR);
console.log('');
console.log('To publish the deprecation notice:');
console.log('  cd ' + TEMP_DIR);
console.log('  npm publish');
console.log('');
console.log('This will show warnings to anyone installing prism-uncertainty');
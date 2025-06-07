const fs = require('fs');
const path = require('path');

// Fix .mjs file extensions and create proper ES module output
function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.js')) {
      // Copy .js files from esm directory to .mjs in dist
      const content = fs.readFileSync(filePath, 'utf8');
      const mjsPath = filePath.replace('/esm/', '/').replace('.js', '.mjs');
      
      // Fix import statements to include .mjs extension
      const fixedContent = content.replace(
        /from ['"](\.[^'"]+)['"]/g,
        (match, importPath) => {
          if (!importPath.endsWith('.mjs') && !importPath.endsWith('.json')) {
            return `from '${importPath}.mjs'`;
          }
          return match;
        }
      );
      
      fs.writeFileSync(mjsPath, fixedContent);
    }
  });
}

// Create ES module output
if (fs.existsSync('dist/esm')) {
  processDirectory('dist/esm');
  // Clean up ESM build directory
  fs.rmSync('dist/esm', { recursive: true, force: true });
}

console.log('✅ Fixed ES module extensions');
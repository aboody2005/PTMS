const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');

function searchFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        searchFiles(fullPath);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.css') || file.endsWith('.sql')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes('password')) {
          console.log(`${path.relative(projectDir, fullPath)}:${index + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

searchFiles(projectDir);

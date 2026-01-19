const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'gui', 'index.html');
const dest = path.join(__dirname, '..', 'dist', 'gui', 'index.html');

// Ensure destination directory exists
const destDir = path.dirname(dest);
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy file
fs.copyFileSync(src, dest);
console.log('Copied index.html to dist/gui/');

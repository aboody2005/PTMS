const fs = require('fs');
const path = require('path');

const srcDir = 'c:/Users/pc/OneDrive/Documents/Pharmacy Training Management System Front/ptms';
const destDir = 'c:/Users/pc/OneDrive/Documents/Pharmacy Training Management System/ptms';

const files = [
  'components/MapInner.js',
  'components/Topbar.js',
  'context/LanguageContext.js',
  'context/ThemeContext.js',
  'app/(dashboard)/admin/profile/page.js',
  'app/(dashboard)/admin/locations/page.js',
  'app/(dashboard)/admin/users/page.js',
  'app/(dashboard)/teacher/profile/page.js',
  'app/(dashboard)/teacher/students/page.js',
  'app/(dashboard)/layout.js'
];

files.forEach(file => {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);
  
  // Ensure destination directory exists
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  
  // Copy file
  fs.copyFileSync(src, dest);
  console.log(`Copied ${file}`);
});

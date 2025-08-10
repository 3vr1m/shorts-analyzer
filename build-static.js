const fs = require('fs');
const path = require('path');

console.log('🔧 Preparing static build...');

// Backup original next.config.ts
if (fs.existsSync('next.config.ts')) {
  fs.copyFileSync('next.config.ts', 'next.config.ts.backup');
}

// Use static config
fs.copyFileSync('next.config.static.ts', 'next.config.ts');

// Create API directory stubs (empty pages that won't break the build)
const apiDir = 'src/app/api-disabled';
if (fs.existsSync('src/app/api')) {
  fs.renameSync('src/app/api', apiDir);
  console.log('✅ API routes temporarily disabled for static build');
}

console.log('✅ Ready for static build. Run: npm run build');
console.log('🔄 To restore full functionality: node restore-api.js');

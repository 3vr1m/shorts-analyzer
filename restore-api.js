const fs = require('fs');

console.log('🔧 Restoring full functionality...');

// Restore original next.config.ts
if (fs.existsSync('next.config.ts.backup')) {
  fs.copyFileSync('next.config.ts.backup', 'next.config.ts');
  fs.unlinkSync('next.config.ts.backup');
}

// Restore API routes
if (fs.existsSync('src/app/api-disabled')) {
  if (fs.existsSync('src/app/api')) {
    fs.rmSync('src/app/api', { recursive: true });
  }
  fs.renameSync('src/app/api-disabled', 'src/app/api');
}

console.log('✅ Full functionality restored!');

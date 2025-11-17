#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function fixImports(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      fixImports(fullPath);
    } else if (entry.name.endsWith('.d.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      // Replace .ts extensions with .js in import/export statements
      content = content.replace(/from ["'](\.\S+)\.ts["']/g, 'from "$1.js"');
      content = content.replace(/export \* from ["'](\.\S+)\.ts["']/g, 'export * from "$1.js"');
      fs.writeFileSync(fullPath, content);
    }
  }
}

fixImports(path.join(__dirname, '../dist'));

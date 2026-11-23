import fs from 'fs';
import path from 'path';

let totalFiles = 0;
let totalErrors = 0;
const errors = [];

function checkFile(filePath) {
  totalFiles++;
  const content = fs.readFileSync(filePath, 'utf8');
  const definedSymbols = new Set(['React', 'Fragment']);

  // Extract imports
  const importRegex = /import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const rawImport = match[1].trim();

    // Default import before comma: import Foo, { Bar } from ...
    const defaultBeforeComma = rawImport.match(/^([A-Za-z0-9_$]+)\s*,/);
    if (defaultBeforeComma) {
      definedSymbols.add(defaultBeforeComma[1]);
    }

    // Default import standalone: import Foo from ...
    if (/^[A-Za-z0-9_$]+$/.test(rawImport)) {
      definedSymbols.add(rawImport);
    }

    // Namespace import: import * as Foo from ...
    const nsMatch = rawImport.match(/\*\s+as\s+([A-Za-z0-9_$]+)/);
    if (nsMatch) {
      definedSymbols.add(nsMatch[1]);
    }

    // Named imports: { Foo, Bar as Baz }
    const namedMatch = rawImport.match(/\{([\s\S]*?)\}/);
    if (namedMatch) {
      namedMatch[1].split(',').forEach(item => {
        const parts = item.trim().split(/\s+as\s+/);
        const name = parts[parts.length - 1].trim();
        if (name && /^[A-Za-z0-9_$]+$/.test(name)) {
          definedSymbols.add(name);
        }
      });
    }
  }

  // Extract declarations (const, let, var, function, class)
  const declRegex = /(?:const|let|var|function|class)\s+([A-Za-z0-9_$]+)/g;
  while ((match = declRegex.exec(content)) !== null) {
    definedSymbols.add(match[1]);
  }

  // Extract destructured identifiers e.g. { icon: HeaderIcon }
  const renameRegex = /:\s*([A-Z][A-Za-z0-9_$]*)/g;
  while ((match = renameRegex.exec(content)) !== null) {
    definedSymbols.add(match[1]);
  }

  // Extract JSX tags: <Tag or <Tag.Sub
  const jsxRegex = /<([A-Z][A-Za-z0-9_$]*)/g;
  const missing = new Set();
  while ((match = jsxRegex.exec(content)) !== null) {
    const tag = match[1];
    if (!definedSymbols.has(tag)) {
      missing.add(tag);
    }
  }

  if (missing.size > 0) {
    totalErrors++;
    errors.push({ file: filePath, missing: Array.from(missing) });
  }

  // Check for unsafe shift.flags.map without Array.isArray
  if (/shift\.flags\.(map|filter|some|forEach)\(/.test(content)) {
    // Check if protected by Array.isArray
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (/shift\.flags\.(map|filter|some|forEach)\(/.test(line)) {
        if (!line.includes('Array.isArray') && !lines[Math.max(0, idx - 1)].includes('Array.isArray')) {
          totalErrors++;
          errors.push({ file: filePath, missing: [`Line ${idx + 1}: Unsafe shift.flags method call without Array.isArray guard`] });
        }
      }
    });
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
      walk(full);
    } else if (entry.name.endsWith('.jsx')) {
      checkFile(full);
    }
  }
}

console.log('--- RUNNING AUTOMATED CODEBASE & JSX AUDIT ---');
walk('src');
console.log(`Audited ${totalFiles} JSX component files.`);

if (errors.length > 0) {
  console.error('\n❌ AUDIT FAILED: The following issues must be resolved before building:');
  for (const err of errors) {
    console.error(`  - ${err.file}: ${err.missing.join(', ')}`);
  }
  process.exit(1);
} else {
  console.log('✅ AUDIT PASSED: All JSX components, icons, and array guards verified successfully!\n');
  process.exit(0);
}

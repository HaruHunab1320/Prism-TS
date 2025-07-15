
console.error('\n\n⚠️  DEPRECATION WARNING ⚠️');
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
console.error('=====================================\n\n');

throw new Error('prism-uncertainty is deprecated. Please install @prism/core instead.');

# Import Updates Summary

## Changes Made

All imports in the prism-validator package have been updated to use '@prism-lang/core' instead of relative paths to parent directories.

### Files Updated:

1. **types.ts**
   - Changed: `import { ASTNode } from '../ast';`
   - To: `import { ASTNode } from '@prism-lang/core';`

2. **streaming.ts**
   - Changed: `import { tokenize, Token, TokenType } from '../tokenizer';`
   - To: `import { tokenize, Token, TokenType } from '@prism-lang/core';`

3. **linter.ts**
   - Changed: `import { ASTNode } from '../ast';`
   - To: `import { ASTNode } from '@prism-lang/core';`
   - Changed: `const { parse } = require('../parser');`
   - To: `const { parse } = require('@prism-lang/core');`

4. **type-checker.ts**
   - Changed: `import { ASTNode } from '../ast';`
   - To: `import { ASTNode } from '@prism-lang/core';`

5. **confidence-checker.ts**
   - Changed: `import { ASTNode } from '../ast';`
   - To: `import { ASTNode } from '@prism-lang/core';`

6. **validator.ts**
   - Changed: `import { parse } from '../parser';` and `import { ASTNode } from '../ast';`
   - To: `import { parse, ASTNode } from '@prism-lang/core';`

### Files Not Modified:
- **index.ts** - Only exports from local files (correct)
- **error-formatter.ts** - Only imports from local files (correct)
- **unified-validator.ts** - Only imports from local files (correct)

All relative imports that referenced parent directories (../) have been successfully replaced with the @prism-lang/core package import.
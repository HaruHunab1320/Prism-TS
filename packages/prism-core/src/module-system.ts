import * as fs from 'fs';
import * as path from 'path';
import { tokenize } from './tokenizer';
import { Parser } from './parser';
import { ImportStatement, ExportStatement } from './ast';
import { Runtime, Value, UndefinedValue, ObjectValue } from './runtime';
import { createRuntime } from './runtime';

export interface ModuleExports {
  default?: Value;
  named: Map<string, Value>;
}

export interface Module {
  path: string;
  exports: ModuleExports;
  environment: any; // Runtime environment
  isExecuted: boolean;
  isExecuting: boolean; // Track if module is currently executing
}

export class ModuleSystem {
  private modules: Map<string, Module> = new Map();
  private currentModulePath: string | null = null;
  private fileReader: (path: string) => string;
  
  constructor(fileReader?: (path: string) => string) {
    // Allow custom file reader for testing/different environments
    this.fileReader = fileReader || ((p: string) => fs.readFileSync(p, 'utf-8'));
  }
  
  /**
   * Resolve a module path relative to the current module
   */
  private resolvePath(importPath: string, fromPath: string): string {
    // Handle relative paths
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const dir = path.dirname(fromPath);
      let resolved = path.resolve(dir, importPath);
      
      // Add .prism extension if not present
      if (!resolved.endsWith('.prism')) {
        resolved += '.prism';
      }
      
      return resolved;
    }
    
    // Handle absolute paths or node_modules (simplified for now)
    // In a real implementation, we'd search node_modules directories
    if (!importPath.endsWith('.prism')) {
      importPath += '.prism';
    }
    
    return importPath;
  }
  
  /**
   * Load and execute a module
   */
  async loadModule(modulePath: string, runtime: Runtime): Promise<Module> {
    // Check cache
    const existingModule = this.modules.get(modulePath);
    if (existingModule) {
      if (existingModule.isExecuting) {
        // Module is currently executing - this is a circular dependency
        // Return the module with its current (partial) exports
        return existingModule;
      }
      if (existingModule.isExecuted) {
        // Module is fully loaded
        return existingModule;
      }
    }
    
    // Create new module
    const module: Module = {
      path: modulePath,
      exports: {
        named: new Map()
      },
      environment: null,
      isExecuted: false,
      isExecuting: false
    };
    
    // Add to cache before execution to handle circular deps
    this.modules.set(modulePath, module);
    
    // Execute module
    await this.executeModule(module, runtime);
    
    return module;
  }
  
  /**
   * Execute a module's code
   */
  private async executeModule(module: Module, _parentRuntime: Runtime): Promise<void> {
    module.isExecuting = true;
    
    try {
      // Read file
      const source = this.fileReader(module.path);
      
      // Parse
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      
      // Create module-specific runtime with its own environment
      const moduleRuntime = createRuntime();
      
      // Store current module path for import resolution
      const previousModulePath = this.currentModulePath;
      this.currentModulePath = module.path;
      
      // Inject module system into runtime (need to access interpreter)
      const interpreter = (moduleRuntime as any).interpreter;
      (interpreter as any).__moduleSystem = this;
      (interpreter as any).__currentModule = module;
      
      // Execute module
      await moduleRuntime.execute(ast);
      
      // Store module environment
      module.environment = interpreter.environment;
      
      // Restore previous module path
      this.currentModulePath = previousModulePath;
      
      module.isExecuted = true;
      module.isExecuting = false;
      
    } catch (error) {
      module.isExecuting = false;
      throw new Error(`Failed to load module ${module.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Handle import statement execution
   */
  async executeImport(importStmt: ImportStatement, runtime: any): Promise<void> {
    const currentModule = runtime.__currentModule;
    if (!currentModule) {
      throw new Error('Import statements can only be used within modules');
    }
    
    // Resolve module path
    const resolvedPath = this.resolvePath(importStmt.source, currentModule.path);
    
    // Load module - create a new runtime for it
    const importRuntime = createRuntime();
    const importedModule = await this.loadModule(resolvedPath, importRuntime);
    
    // Special handling for circular dependencies
    const isCircular = importedModule.isExecuting && !importedModule.isExecuted;
    
    // Process import specifiers
    if (importStmt.defaultImport) {
      const defaultExport = importedModule.exports.default;
      if (!defaultExport && !isCircular) {
        throw new Error(`Module ${resolvedPath} has no default export`);
      }
      runtime.environment.define(importStmt.defaultImport, defaultExport || new UndefinedValue());
    }
    
    // Handle namespace import (import * as name from 'module')
    if (importStmt.namespaceImport) {
      // Create an object with all exports
      const namespaceObj: any = {};
      
      // Add default export if exists
      if (importedModule.exports.default) {
        namespaceObj.default = importedModule.exports.default;
      }
      
      // Add named exports
      for (const [name, value] of importedModule.exports.named) {
        namespaceObj[name] = value;
      }
      
      // Create object value from namespace
      const namespaceMap = new Map<string, Value>();
      for (const [key, value] of Object.entries(namespaceObj)) {
        namespaceMap.set(key, value as Value);
      }
      
      runtime.environment.define(
        importStmt.namespaceImport,
        new ObjectValue(namespaceMap)
      );
    }
    
    // Handle named imports
    for (const specifier of importStmt.specifiers) {
      const exportName = specifier.imported;
      const localName = specifier.local || specifier.imported; // Use local name if provided, otherwise use imported name
      
      const exportedValue = importedModule.exports.named.get(exportName);
      if (!exportedValue && !isCircular) {
        throw new Error(`Module ${resolvedPath} has no export named '${exportName}'`);
      }
      
      runtime.environment.define(localName, exportedValue || new UndefinedValue());
    }
  }
  
  /**
   * Handle export statement execution
   */
  async executeExport(exportStmt: ExportStatement, runtime: any): Promise<void> {
    const currentModule = runtime.__currentModule;
    if (!currentModule) {
      throw new Error('Export statements can only be used within modules');
    }
    
    // Handle default export
    if (exportStmt.isDefault && exportStmt.declaration) {
      const value = await runtime.interpret(exportStmt.declaration);
      currentModule.exports.default = value;
      return;
    }
    
    // Handle named exports from declaration
    if (exportStmt.declaration) {
      // Evaluate the declaration
      const value = await runtime.interpret(exportStmt.declaration);
      
      // Handle different declaration types
      if (exportStmt.declaration.type === 'AssignmentStatement') {
        // export name = value
        const assignment = exportStmt.declaration as any;
        if (assignment.identifier) {
          currentModule.exports.named.set(assignment.identifier, value);
        }
      } else if (exportStmt.declaration.type === 'VariableDeclaration') {
        // export const/let name = value
        // Variable declarations return 0, so we need to get the actual value
        const varDecl = exportStmt.declaration as any;
        if (varDecl.identifier) {
          // The variable has already been defined by interpreting the declaration
          const actualValue = runtime.environment.get(varDecl.identifier);
          currentModule.exports.named.set(varDecl.identifier, actualValue);
        }
      } else if (exportStmt.declaration.type === 'FunctionDeclaration') {
        // export function name() { ... }
        const funcDecl = exportStmt.declaration as any;
        if (funcDecl.name) {
          currentModule.exports.named.set(funcDecl.name, value);
        }
      }
    }
    
    // Handle export list (export { a, b, c })
    if (exportStmt.specifiers) {
      for (const specifier of exportStmt.specifiers) {
      const localName = specifier.local;
      const exportName = specifier.exported || localName;
      
      let value: Value;
      try {
        value = runtime.environment.get(localName);
      } catch (e) {
        throw new Error(`Cannot export '${localName}': variable not defined`);
      }
      
      currentModule.exports.named.set(exportName, value);
      }
    }
    
    // Handle re-exports (export { x } from './other')
    if (exportStmt.source) {
      const resolvedPath = this.resolvePath(exportStmt.source, currentModule.path);
      // Create a new runtime for the imported module
      const importRuntime = createRuntime();
      const sourceModule = await this.loadModule(resolvedPath, importRuntime);
      
      if (!exportStmt.specifiers || exportStmt.specifiers.length === 0) {
        // export * from './other'
        // Re-export all named exports
        for (const [name, value] of sourceModule.exports.named) {
          currentModule.exports.named.set(name, value);
        }
      } else {
        // export { specific } from './other'
        for (const specifier of exportStmt.specifiers) {
          const importName = specifier.local;
          const exportName = specifier.exported || importName;
          
          const value = sourceModule.exports.named.get(importName);
          if (!value) {
            throw new Error(`Module ${resolvedPath} has no export named '${importName}'`);
          }
          
          currentModule.exports.named.set(exportName, value);
        }
      }
    }
  }
  
  /**
   * Clear module cache (useful for testing)
   */
  clearCache(): void {
    this.modules.clear();
  }
}


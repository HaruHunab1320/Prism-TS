import { parse } from '../src/parser';
import {
  ImportStatement,
  ExportStatement,
  ImportSpecifier,
  ExportSpecifier,
  AssignmentStatement,
  ExpressionStatement,
  IdentifierExpression,
  NumberLiteral,
} from '../src/ast';

describe('Import/Export System', () => {
  describe('Import Statements', () => {
    it('should parse default import', () => {
      const program = parse('import defaultName from "module"');
      expect(program.statements).toHaveLength(1);
      
      const stmt = program.statements[0] as ImportStatement;
      expect(stmt).toBeInstanceOf(ImportStatement);
      expect(stmt.defaultImport).toBe('defaultName');
      expect(stmt.source).toBe('module');
      expect(stmt.specifiers).toHaveLength(0);
      expect(stmt.namespaceImport).toBeUndefined();
    });

    it('should parse named imports', () => {
      const program = parse('import {sum, multiply} from "math"');
      expect(program.statements).toHaveLength(1);
      
      const stmt = program.statements[0] as ImportStatement;
      expect(stmt).toBeInstanceOf(ImportStatement);
      expect(stmt.specifiers).toHaveLength(2);
      expect(stmt.specifiers[0].imported).toBe('sum');
      expect(stmt.specifiers[0].local).toBeUndefined();
      expect(stmt.specifiers[1].imported).toBe('multiply');
      expect(stmt.specifiers[1].local).toBeUndefined();
      expect(stmt.source).toBe('math');
      expect(stmt.defaultImport).toBeUndefined();
      expect(stmt.namespaceImport).toBeUndefined();
    });

    it('should parse renamed imports', () => {
      const program = parse('import {original as renamed, another} from "module"');
      expect(program.statements).toHaveLength(1);
      
      const stmt = program.statements[0] as ImportStatement;
      expect(stmt).toBeInstanceOf(ImportStatement);
      expect(stmt.specifiers).toHaveLength(2);
      expect(stmt.specifiers[0].imported).toBe('original');
      expect(stmt.specifiers[0].local).toBe('renamed');
      expect(stmt.specifiers[1].imported).toBe('another');
      expect(stmt.specifiers[1].local).toBeUndefined();
      expect(stmt.source).toBe('module');
    });

    it('should parse namespace import', () => {
      const program = parse('import * as math from "math-utils"');
      expect(program.statements).toHaveLength(1);
      
      const stmt = program.statements[0] as ImportStatement;
      expect(stmt).toBeInstanceOf(ImportStatement);
      expect(stmt.namespaceImport).toBe('math');
      expect(stmt.source).toBe('math-utils');
      expect(stmt.specifiers).toHaveLength(0);
      expect(stmt.defaultImport).toBeUndefined();
    });

    it('should parse mixed default and named imports', () => {
      const program = parse('import defaultName, {named1, named2} from "module"');
      expect(program.statements).toHaveLength(1);
      
      const stmt = program.statements[0] as ImportStatement;
      expect(stmt).toBeInstanceOf(ImportStatement);
      expect(stmt.defaultImport).toBe('defaultName');
      expect(stmt.specifiers).toHaveLength(2);
      expect(stmt.specifiers[0].imported).toBe('named1');
      expect(stmt.specifiers[1].imported).toBe('named2');
      expect(stmt.source).toBe('module');
    });

    it('should parse import with optional semicolon', () => {
      const program = parse('import {test} from "module";');
      expect(program.statements).toHaveLength(1);
      
      const stmt = program.statements[0] as ImportStatement;
      expect(stmt).toBeInstanceOf(ImportStatement);
      expect(stmt.specifiers).toHaveLength(1);
      expect(stmt.specifiers[0].imported).toBe('test');
      expect(stmt.source).toBe('module');
    });

    it('should parse empty named imports', () => {
      const program = parse('import {} from "side-effects-only"');
      expect(program.statements).toHaveLength(1);
      
      const stmt = program.statements[0] as ImportStatement;
      expect(stmt).toBeInstanceOf(ImportStatement);
      expect(stmt.specifiers).toHaveLength(0);
      expect(stmt.source).toBe('side-effects-only');
    });
  });

  describe('Export Statements', () => {
    it('should parse default export with expression', () => {
      const program = parse('export default 42');
      expect(program.statements).toHaveLength(1);
      
      const stmt = program.statements[0] as ExportStatement;
      expect(stmt).toBeInstanceOf(ExportStatement);
      expect(stmt.isDefault).toBe(true);
      expect(stmt.declaration).toBeInstanceOf(ExpressionStatement);
      expect(stmt.specifiers).toBeUndefined();
      expect(stmt.source).toBeUndefined();
    });

    it('should parse default export with assignment', () => {
      const program = parse('export default result = calculate()');
      expect(program.statements).toHaveLength(1);
      
      const stmt = program.statements[0] as ExportStatement;
      expect(stmt).toBeInstanceOf(ExportStatement);
      expect(stmt.isDefault).toBe(true);
      expect(stmt.declaration).toBeInstanceOf(AssignmentStatement);
    });

    it('should parse named exports', () => {
      const program = parse('export {sum, multiply}');
      expect(program.statements).toHaveLength(1);
      
      const stmt = program.statements[0] as ExportStatement;
      expect(stmt).toBeInstanceOf(ExportStatement);
      expect(stmt.specifiers).toHaveLength(2);
      expect(stmt.specifiers![0].local).toBe('sum');
      expect(stmt.specifiers![0].exported).toBeUndefined();
      expect(stmt.specifiers![1].local).toBe('multiply');
      expect(stmt.specifiers![1].exported).toBeUndefined();
      expect(stmt.source).toBeUndefined();
      expect(stmt.isDefault).toBeFalsy();
    });

    it('should parse renamed exports', () => {
      const program = parse('export {localName as exportedName, another}');
      expect(program.statements).toHaveLength(1);
      
      const stmt = program.statements[0] as ExportStatement;
      expect(stmt).toBeInstanceOf(ExportStatement);
      expect(stmt.specifiers).toHaveLength(2);
      expect(stmt.specifiers![0].local).toBe('localName');
      expect(stmt.specifiers![0].exported).toBe('exportedName');
      expect(stmt.specifiers![1].local).toBe('another');
      expect(stmt.specifiers![1].exported).toBeUndefined();
    });

    it('should parse re-exports', () => {
      const program = parse('export {name1, name2} from "other-module"');
      expect(program.statements).toHaveLength(1);
      
      const stmt = program.statements[0] as ExportStatement;
      expect(stmt).toBeInstanceOf(ExportStatement);
      expect(stmt.specifiers).toHaveLength(2);
      expect(stmt.specifiers![0].local).toBe('name1');
      expect(stmt.specifiers![1].local).toBe('name2');
      expect(stmt.source).toBe('other-module');
    });

    it('should parse namespace re-export', () => {
      const program = parse('export * from "utilities"');
      expect(program.statements).toHaveLength(1);
      
      const stmt = program.statements[0] as ExportStatement;
      expect(stmt).toBeInstanceOf(ExportStatement);
      expect(stmt.isNamespace).toBe(true);
      expect(stmt.source).toBe('utilities');
      expect(stmt.specifiers).toBeUndefined();
    });

    it('should parse direct export of statement', () => {
      const program = parse('export value = 10 + 5');
      expect(program.statements).toHaveLength(1);
      
      const stmt = program.statements[0] as ExportStatement;
      expect(stmt).toBeInstanceOf(ExportStatement);
      expect(stmt.declaration).toBeInstanceOf(AssignmentStatement);
      expect(stmt.specifiers).toBeUndefined();
      expect(stmt.isDefault).toBeFalsy();
    });

    it('should parse export with optional semicolon', () => {
      const program = parse('export {test};');
      expect(program.statements).toHaveLength(1);
      
      const stmt = program.statements[0] as ExportStatement;
      expect(stmt).toBeInstanceOf(ExportStatement);
      expect(stmt.specifiers).toHaveLength(1);
      expect(stmt.specifiers![0].local).toBe('test');
    });

    it('should parse empty named exports', () => {
      const program = parse('export {}');
      expect(program.statements).toHaveLength(1);
      
      const stmt = program.statements[0] as ExportStatement;
      expect(stmt).toBeInstanceOf(ExportStatement);
      expect(stmt.specifiers).toHaveLength(0);
    });
  });

  describe('AST Node Types', () => {
    it('should create ImportSpecifier correctly', () => {
      const specifier = new ImportSpecifier('original', 'local');
      expect(specifier.type).toBe('ImportSpecifier');
      expect(specifier.imported).toBe('original');
      expect(specifier.local).toBe('local');
    });

    it('should create ImportSpecifier without local name', () => {
      const specifier = new ImportSpecifier('name');
      expect(specifier.type).toBe('ImportSpecifier');
      expect(specifier.imported).toBe('name');
      expect(specifier.local).toBeUndefined();
    });

    it('should create ExportSpecifier correctly', () => {
      const specifier = new ExportSpecifier('local', 'exported');
      expect(specifier.type).toBe('ExportSpecifier');
      expect(specifier.local).toBe('local');
      expect(specifier.exported).toBe('exported');
    });

    it('should create ExportSpecifier without exported name', () => {
      const specifier = new ExportSpecifier('name');
      expect(specifier.type).toBe('ExportSpecifier');
      expect(specifier.local).toBe('name');
      expect(specifier.exported).toBeUndefined();
    });

    it('should create ImportStatement correctly', () => {
      const specifiers = [new ImportSpecifier('test')];
      const stmt = new ImportStatement(specifiers, './module', 'defaultName', 'namespace');
      expect(stmt.type).toBe('ImportStatement');
      expect(stmt.specifiers).toEqual(specifiers);
      expect(stmt.source).toBe('./module');
      expect(stmt.defaultImport).toBe('defaultName');
      expect(stmt.namespaceImport).toBe('namespace');
    });

    it('should create ExportStatement correctly', () => {
      const specifiers = [new ExportSpecifier('test')];
      const declaration = new AssignmentStatement('x', new NumberLiteral(5));
      const stmt = new ExportStatement(specifiers, './module', declaration, true, false);
      expect(stmt.type).toBe('ExportStatement');
      expect(stmt.specifiers).toEqual(specifiers);
      expect(stmt.source).toBe('./module');
      expect(stmt.declaration).toEqual(declaration);
      expect(stmt.isDefault).toBe(true);
      expect(stmt.isNamespace).toBe(false);
    });
  });

  describe('Error Cases', () => {
    it('should throw error for invalid import syntax', () => {
      expect(() => parse('import from "module"')).toThrow('Expected import specifier');
    });

    it('should throw error for missing from keyword', () => {
      expect(() => parse('import {test} "module"')).toThrow('Expected \'from\' after import specifiers');
    });

    it('should throw error for missing module path', () => {
      expect(() => parse('import {test} from')).toThrow();
    });

    it('should throw error for invalid export * syntax', () => {
      expect(() => parse('export * "module"')).toThrow('Expected \'from\' after \'export *\'');
    });

    it('should throw error for invalid namespace import', () => {
      expect(() => parse('import * name from "module"')).toThrow('Expected \'as\' after \'*\'');
    });

    it('should allow trailing comma in named imports', () => {
      const program = parse('import {name,} from "module"');
      expect(program.statements).toHaveLength(1);
      const stmt = program.statements[0] as ImportStatement;
      expect(stmt.specifiers).toHaveLength(1);
      expect(stmt.specifiers[0].imported).toBe('name');
    });
  });

  describe('Real-world Examples', () => {
    it('should parse complex import scenario', () => {
      const code = `
        import defaultExport, {named1, named2 as renamed} from "complex-module"
        import * as utils from "utilities"
        import {sideEffect} from "side-effects"
      `;
      
      const program = parse(code);
      expect(program.statements).toHaveLength(3);
      
      // First import: mixed default and named
      const stmt1 = program.statements[0] as ImportStatement;
      expect(stmt1.defaultImport).toBe('defaultExport');
      expect(stmt1.specifiers).toHaveLength(2);
      expect(stmt1.specifiers[1].local).toBe('renamed');
      
      // Second import: namespace
      const stmt2 = program.statements[1] as ImportStatement;
      expect(stmt2.namespaceImport).toBe('utils');
      
      // Third import: named
      const stmt3 = program.statements[2] as ImportStatement;
      expect(stmt3.specifiers).toHaveLength(1);
      expect(stmt3.specifiers[0].imported).toBe('sideEffect');
    });

    it('should parse complex export scenario', () => {
      const code = `
        export default calculate = (x, y) => x + y
        export {helper1, helper2 as utilityHelper}
        export * from "shared-utilities"
        export result = process(data)
      `;
      
      const program = parse(code);
      expect(program.statements).toHaveLength(4);
      
      // First export: default
      const stmt1 = program.statements[0] as ExportStatement;
      expect(stmt1.isDefault).toBe(true);
      
      // Second export: named with renaming
      const stmt2 = program.statements[1] as ExportStatement;
      expect(stmt2.specifiers).toHaveLength(2);
      expect(stmt2.specifiers![1].exported).toBe('utilityHelper');
      
      // Third export: namespace re-export
      const stmt3 = program.statements[2] as ExportStatement;
      expect(stmt3.isNamespace).toBe(true);
      expect(stmt3.source).toBe('shared-utilities');
      
      // Fourth export: direct statement
      const stmt4 = program.statements[3] as ExportStatement;
      expect(stmt4.declaration).toBeInstanceOf(AssignmentStatement);
    });

    it('should handle Prism-specific module paths', () => {
      const code = `
        import {llm, confidence} from "@prism-lang/core"
        import {analyze} from "./analysis.prism"
        export {processData} from "../utils/data.prism"
      `;
      
      const program = parse(code);
      expect(program.statements).toHaveLength(3);
      
      const stmt1 = program.statements[0] as ImportStatement;
      expect(stmt1.source).toBe('@prism-lang/core');
      
      const stmt2 = program.statements[1] as ImportStatement;
      expect(stmt2.source).toBe('./analysis.prism');
      
      const stmt3 = program.statements[2] as ExportStatement;
      expect(stmt3.source).toBe('../utils/data.prism');
    });
  });
});
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getVersion, executeCode, readFileSync } from '../src/cli-utils';

jest.mock('@prism-lang/llm', () => ({
  LLMConfigManager: {
    createFromEnvironment: jest.fn(() => ({})),
    getDefaultProvider: jest.fn(() => 'mock'),
    getAvailableProviders: jest.fn(() => ['mock'])
  }
}));

describe('CLI Utils', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-utils-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getVersion', () => {
    it('should return version from package.json', () => {
      const version = getVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('executeCode', () => {
    it('should execute simple arithmetic', async () => {
      const result = await executeCode('2 + 3');
      expect(result.type).toBe('number');
      expect(result.value).toBe(5);
    });

    it('should execute code with variables', async () => {
      const result = await executeCode('x = 10; y = 20; x + y');
      expect(result.type).toBe('number');
      expect(result.value).toBe(30);
    });

    it('should handle confidence values', async () => {
      const result = await executeCode('42 ~> 0.9');
      expect(result.value.type).toBe('number');
      expect(result.value.value).toBe(42);
      expect(result.confidence.value).toBeCloseTo(0.9);
    });

    it('should throw on invalid syntax', async () => {
      await expect(executeCode('invalid syntax!!!')).rejects.toThrow();
    });
  });

  describe('readFileSync', () => {
    it('should read existing file', () => {
      const testFile = path.join(tempDir, 'test.txt');
      const content = 'Hello, Prism!';
      fs.writeFileSync(testFile, content);
      
      const result = readFileSync(testFile);
      expect(result).toBe(content);
    });

    it('should throw on non-existent file', () => {
      expect(() => {
        readFileSync(path.join(tempDir, 'nonexistent.txt'));
      }).toThrow('File not found');
    });
  });
});
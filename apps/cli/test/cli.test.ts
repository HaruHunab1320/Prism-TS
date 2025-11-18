import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Helper to run CLI commands
function runCLI(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const cliPath = path.join(__dirname, '..', 'src', 'index.ts');
    // Create completely fresh environment for each test
    const freshEnv = {
      ...process.env,
      NODE_ENV: 'test',
      // Clear any potential cache or state variables
      NODE_OPTIONS: '',
      TS_NODE_PROJECT: undefined,
    };
    const child = spawn('ts-node', ['--project', 'tsconfig.dev.json', cliPath, ...args], {
      env: freshEnv,
      stdio: ['pipe', 'pipe', 'pipe'], // Ensure clean stdio
      detached: false
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      // Add small delay to ensure process cleanup
      setTimeout(() => {
        resolve({ code: code || 0, stdout, stderr });
      }, 50);
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ code: 1, stdout: '', stderr: error.message });
    });

    // Add timeout to prevent hanging processes
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ code: 1, stdout: '', stderr: 'Process timeout' });
    }, 10000);
  });
}

describe('Prism CLI', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-cli-test-'));
    // Add small delay to ensure clean state between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('eval command', () => {
    it('should evaluate simple expression', async () => {
      const { code, stdout } = await runCLI(['eval', '2 + 3']);
      expect(code).toBe(0);
      expect(stdout.trim()).toBe('5');
    });

    it('should evaluate expression with confidence', async () => {
      const { code, stdout } = await runCLI(['eval', 'x = 42 ~> 0.9']);
      expect(code).toBe(0);
      expect(stdout).toContain('42');
      expect(stdout).toContain('0.9');
    });

    it('should handle multi-word expressions', async () => {
      const { code, stdout } = await runCLI(['eval', 'x', '=', '10;', 'x', '*', '2']);
      expect(code).toBe(0);
      expect(stdout.trim()).toBe('20');
    });

    it('should error on invalid code', async () => {
      const { code, stderr } = await runCLI(['eval', 'invalid syntax!!!']);
      expect(code).toBe(1);
      expect(stderr.toLowerCase()).toContain('error');
    });

    it('should error when no code provided', async () => {
      const { code, stderr } = await runCLI(['eval']);
      expect(code).toBe(1);
      expect(stderr).toContain('Missing code to evaluate');
    });
  });

  describe('run command', () => {
    it('should run a valid Prism file', async () => {
      const testFile = path.join(tempDir, 'test.prism');
      fs.writeFileSync(testFile, 'x = 10\ny = 20\nx + y');
      
      const { code, stdout } = await runCLI(['run', testFile]);
      expect(code).toBe(0);
      expect(stdout).toContain('Running');
      expect(stdout).toContain('30');
    });

    it('should handle files with confidence values', async () => {
      const testFile = path.join(tempDir, 'confidence.prism');
      fs.writeFileSync(testFile, 'temp = 72 ~> 0.95\ntemp');
      
      const { code, stdout } = await runCLI(['run', testFile]);
      expect(code).toBe(0);
      expect(stdout).toContain('72');
      expect(stdout).toContain('0.95');
    });

    it('should error on non-existent file', async () => {
      const { code, stderr } = await runCLI(['run', 'nonexistent.prism']);
      expect(code).toBe(1);
      expect(stderr).toContain('File not found');
    });

    it('should error when no filename provided', async () => {
      const { code, stderr } = await runCLI(['run']);
      expect(code).toBe(1);
      expect(stderr).toContain('Missing filename');
    });

    it('should error on invalid Prism code in file', async () => {
      const testFile = path.join(tempDir, 'invalid.prism');
      fs.writeFileSync(testFile, 'this is not valid prism code!!!');
      
      const { code, stderr } = await runCLI(['run', testFile]);
      expect(code).toBe(1);
      expect(stderr.toLowerCase()).toContain('error');
    });
  });

  describe('unknown commands', () => {
    it('should error on unknown command', async () => {
      const { code, stderr } = await runCLI(['unknown']);
      expect(code).toBe(1);
      expect(stderr).toContain('Unknown command: unknown');
    });
  });

  describe('--version', () => {
    it('should display version', async () => {
      const { code, stdout } = await runCLI(['--version']);
      expect(code).toBe(0);
      expect(stdout).toMatch(/^Prism v\d+\.\d+\.\d+/);
    });

    it('should display version with -v flag', async () => {
      const { code, stdout } = await runCLI(['-v']);
      expect(code).toBe(0);
      expect(stdout).toMatch(/^Prism v\d+\.\d+\.\d+/);
    });
  });

  describe('--help', () => {
    it('should display help', async () => {
      const { code, stdout } = await runCLI(['--help']);
      expect(code).toBe(0);
      expect(stdout).toContain('Prism Programming Language CLI');
      expect(stdout).toContain('Usage:');
      expect(stdout).toContain('prism run [--watch] <file>');
      expect(stdout).toContain('prism eval <code>');
    });

    it('should display help with -h flag', async () => {
      const { code, stdout } = await runCLI(['-h']);
      expect(code).toBe(0);
      expect(stdout).toContain('Prism Programming Language CLI');
    });
  });
});

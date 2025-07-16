import * as fs from 'fs';
import * as path from 'path';
import { parse, createRuntime } from '@prism-lang/core';
import { LLMConfigManager } from '@prism-lang/llm';

export function getVersion(): string {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
    );
    return packageJson.version;
  } catch {
    return '0.0.0';
  }
}

export async function setupRuntimeWithLLM() {
  const runtime = createRuntime();
  const providers = LLMConfigManager.createFromEnvironment();
  const defaultProvider = LLMConfigManager.getDefaultProvider();
  
  // Register LLM function if providers are available
  if (Object.keys(providers).length > 0) {
    runtime.setGlobal('llm', async (prompt: string) => {
      const provider = providers[defaultProvider];
      if (provider) {
        return await provider.complete(prompt);
      }
      throw new Error('No LLM provider available');
    });
  }
  
  return { runtime, providers, defaultProvider };
}

export async function executeCode(code: string) {
  const { runtime } = await setupRuntimeWithLLM();
  const ast = parse(code);
  return await runtime.execute(ast);
}

export function readFileSync(filename: string): string {
  if (!fs.existsSync(filename)) {
    throw new Error(`File not found: ${filename}`);
  }
  return fs.readFileSync(filename, 'utf-8');
}
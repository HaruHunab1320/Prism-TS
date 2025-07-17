import * as fs from 'fs';
import * as path from 'path';
import { createRuntime, runPrism } from '@prism-lang/core';
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
  
  // Register providers in the runtime
  for (const [name, provider] of Object.entries(providers)) {
    runtime.registerLLMProvider(name, provider);
  }
  
  if (defaultProvider && providers[defaultProvider]) {
    runtime.setDefaultLLMProvider(defaultProvider);
  }
  
  return { runtime, providers, defaultProvider };
}

export async function executeCode(code: string) {
  // Use runPrism helper which handles everything
  const providers = LLMConfigManager.createFromEnvironment();
  const defaultProvider = LLMConfigManager.getDefaultProvider();
  
  let result;
  if (defaultProvider && providers[defaultProvider]) {
    result = await runPrism(code, {
      llmProvider: providers[defaultProvider],
      defaultProviderName: defaultProvider
    });
  } else {
    // No LLM provider, just run the code
    result = await runPrism(code);
  }
  
  return result;
}

export function readFileSync(filename: string): string {
  if (!fs.existsSync(filename)) {
    throw new Error(`File not found: ${filename}`);
  }
  return fs.readFileSync(filename, 'utf-8');
}
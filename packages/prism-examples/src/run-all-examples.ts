/**
 * Run all Prism examples to verify syntax and functionality
 */

import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EXAMPLES_DIR = join(__dirname, '..', 'examples');

interface ExampleResult {
  file: string;
  success: boolean;
  output?: string;
  error?: string;
  metadata?: {
    description?: string;
    tags?: string[];
    expected?: string;
  };
}

async function extractMetadata(content: string): Promise<Record<string, any>> {
  const metadata: Record<string, any> = {};
  
  // Extract metadata from comments
  const descMatch = content.match(/\/\/\s*description:\s*(.+)/);
  const tagsMatch = content.match(/\/\/\s*tags:\s*(.+)/);
  const expectedMatch = content.match(/\/\/\s*expected:\s*(.+)/);
  
  if (descMatch) metadata.description = descMatch[1].trim();
  if (tagsMatch) metadata.tags = tagsMatch[1].trim().split(/\s+/);
  if (expectedMatch) metadata.expected = expectedMatch[1].trim();
  
  return metadata;
}

async function findPrismFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findPrismFiles(fullPath));
    } else if (entry.name.endsWith('.prism')) {
      files.push(fullPath);
    }
  }
  
  return files.sort();
}

async function runExample(filePath: string): Promise<ExampleResult> {
  const relativePath = relative(EXAMPLES_DIR, filePath);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${relativePath}`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    // Read file content
    const content = await readFile(filePath, 'utf-8');
    const metadata = await extractMetadata(content);
    
    // Display metadata
    if (metadata.description) {
      console.log(`Description: ${metadata.description}`);
    }
    if (metadata.tags) {
      console.log(`Tags: ${metadata.tags.join(', ')}`);
    }
    
    // Run the Prism file
    try {
      const output = execSync(`npx prism-cli run "${filePath}"`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      console.log('\nOutput:');
      console.log(output);
      
      return {
        file: relativePath,
        success: true,
        output,
        metadata
      };
    } catch (error: any) {
      console.error('\nError running example:');
      console.error(error.message);
      
      return {
        file: relativePath,
        success: false,
        error: error.message,
        metadata
      };
    }
  } catch (error: any) {
    return {
      file: relativePath,
      success: false,
      error: `Failed to read file: ${error.message}`
    };
  }
}

async function main() {
  console.log('🚀 Prism Examples Test Runner');
  console.log('=============================\n');
  
  try {
    // Find all .prism files
    const prismFiles = await findPrismFiles(EXAMPLES_DIR);
    console.log(`Found ${prismFiles.length} example files\n`);
    
    // Run each example
    const results: ExampleResult[] = [];
    
    for (const file of prismFiles) {
      const result = await runExample(file);
      results.push(result);
    }
    
    // Summary
    console.log('\n\n📊 Summary');
    console.log('==========\n');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Total examples: ${results.length}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed examples:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.file}: ${r.error}`);
        });
    }
    
    // Group by category
    console.log('\n📁 Examples by category:');
    const categories = new Map<string, number>();
    
    results.forEach(r => {
      const category = r.file.split('/')[0];
      categories.set(category, (categories.get(category) || 0) + 1);
    });
    
    for (const [category, count] of categories) {
      console.log(`  ${category}: ${count} examples`);
    }
    
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
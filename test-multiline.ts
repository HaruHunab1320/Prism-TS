import { Tokenizer } from './src/core/tokenizer';
import { Parser } from './src/core/parser';
import { Runtime } from './src/core/runtime';

async function testMultilineParsing() {
  console.log('🧪 Testing Multiline Parsing Fix\n');
  
  const tests = [
    {
      name: 'Multiple statements with semicolons',
      code: 'x = 10; y = 20; z = x + y; z',
      expected: '30'
    },
    {
      name: 'Confidence extraction on one line',
      code: 'temp = 22.5 ~> 0.85; conf = <~ temp; conf',
      expected: '0.85'
    },
    {
      name: 'Complex confidence operations',
      code: 'a = 10 ~> 0.9; b = 20 ~> 0.7; c = a ~+ b; c',
      expectedContains: '30'
    },
    {
      name: 'Parallel confidence one-liner',
      code: 'opt1 = "a" ~> 0.6; opt2 = "b" ~> 0.9; best = opt1 ~||> opt2; best',
      expectedContains: 'b'
    },
    {
      name: 'Trailing semicolon',
      code: '42 ~> 0.9;',
      expectedContains: '42'
    },
    {
      name: 'No semicolons (backwards compatible)',
      code: 'x = 5\ny = 10\nx + y',
      expected: '15'
    }
  ];
  
  const runtime = new Runtime();
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const tokenizer = new Tokenizer(test.code);
      const tokens = tokenizer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      const resultStr = result.toString();
      
      if (test.expected && resultStr === test.expected) {
        console.log(`✅ ${test.name}`);
        console.log(`   Code: ${test.code}`);
        console.log(`   Result: ${resultStr}\n`);
        passed++;
      } else if (test.expectedContains && resultStr.includes(test.expectedContains)) {
        console.log(`✅ ${test.name}`);
        console.log(`   Code: ${test.code}`);
        console.log(`   Result: ${resultStr}\n`);
        passed++;
      } else {
        console.log(`❌ ${test.name}`);
        console.log(`   Code: ${test.code}`);
        console.log(`   Expected: ${test.expected || 'contains ' + test.expectedContains}`);
        console.log(`   Got: ${resultStr}\n`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error.message}`);
      console.log(`   Code: ${test.code}\n`);
      failed++;
    }
  }
  
  console.log('📊 Summary');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`\n${failed === 0 ? '🎉 All tests passed!' : '⚠️ Some tests failed'}`);
}

testMultilineParsing().catch(console.error);
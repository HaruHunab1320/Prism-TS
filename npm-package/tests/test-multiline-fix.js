const { Prism } = require('./dist/index.js');

async function testMultilineFix() {
  console.log('🧪 Testing Multiline Parsing Fix\n');
  
  const prism = new Prism();
  
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
      name: 'No semicolons (backwards compatible)',
      code: 'x = 5\ny = 10\nx + y',
      expected: '15'
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await prism.execute(test.code);
      const resultStr = result.toString();
      
      if (test.expected && resultStr === test.expected) {
        console.log(`✅ ${test.name}`);
        passed++;
      } else if (test.expectedContains && resultStr.includes(test.expectedContains)) {
        console.log(`✅ ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.name}`);
        console.log(`   Expected: ${test.expected || 'contains ' + test.expectedContains}`);
        console.log(`   Got: ${resultStr}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nThe parser still needs semicolon handling improvements.');
  } else {
    console.log('\n🎉 Multiline parsing is working!');
  }
}

testMultilineFix().catch(console.error);
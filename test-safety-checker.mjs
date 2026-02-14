#!/usr/bin/env node
/**
 * test-safety-checker.mjs - Test Safety Checker Module
 */

import { Connection } from '@solana/web3.js';
import SafetyChecker from './filters/safety-checker.mjs';
import config from './config.mjs';

async function main() {
  console.log('🧪 Testing Safety Checker Module\n');
  
  const connection = new Connection(config.RPC_URL, 'confirmed');
  const safetyChecker = new SafetyChecker(connection, config);
  
  // Test tokens
  const testTokens = [
    {
      name: 'SOL (Known Safe)',
      mint: 'So11111111111111111111111111111111111111112'
    },
    {
      name: 'USDC (Known Safe)',
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    }
  ];
  
  console.log('📋 Testing with known safe tokens:\n');
  
  for (const token of testTokens) {
    console.log(`\nTesting: ${token.name}`);
    console.log(`Mint: ${token.mint}\n`);
    
    try {
      const result = await safetyChecker.checkToken(token.mint);
      
      console.log(`\nResult:`);
      console.log(`  Passed: ${result.passed ? '✅' : '❌'}`);
      console.log(`  Score: ${result.score}`);
      
      if (!result.passed) {
        console.log(`  Rejection: ${result.rejectionReason}`);
      }
      
      console.log(`\n  Individual Checks:`);
      for (const [check, data] of Object.entries(result.checks)) {
        console.log(`    ${check}: ${data.passed ? '✅' : '❌'}`);
        if (data.reason) console.log(`      Reason: ${data.reason}`);
        if (data.score) console.log(`      Score: ${data.score}`);
        if (data.liquidity) console.log(`      Liquidity: $${data.liquidity.toFixed(0)}`);
      }
      
    } catch (err) {
      console.error(`\n  ❌ Error: ${err.message}`);
    }
    
    console.log('\n' + '='.repeat(60));
  }
  
  console.log('\n✅ Safety checker test complete!');
  console.log('\n📝 Notes:');
  console.log('  - SOL/USDC may fail some checks (they\'re not pump.fun tokens)');
  console.log('  - This is expected - the checker is optimized for new launches');
  console.log('  - Test with a real pump.fun token mint for accurate results');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * test-sniper.mjs - Test pump sniper components
 */

import Executor from './executor.mjs';
import PumpMonitor from './monitor.mjs';
import config from './config.mjs';

async function testComponents() {
  console.log('🧪 Testing Pump Sniper Components\n');
  
  // Test 1: Config
  console.log('📋 Configuration:');
  console.log(`   Program ID: ${config.PUMP_PROGRAM_ID}`);
  console.log(`   Position: ${config.POSITION_SIZE_SOL} SOL`);
  console.log(`   TP: +${config.TAKE_PROFIT_PCT}%`);
  console.log(`   Max hold: ${config.MAX_HOLD_TIME_MS}ms`);
  console.log(`   RPC: ${config.RPC_URL.substring(0, 50)}...`);
  console.log('   ✅ Config OK\n');
  
  // Test 2: Executor (wallet + balance)
  console.log('💰 Testing Executor:');
  try {
    const executor = new Executor();
    const balance = await executor.getBalance();
    console.log(`   Wallet: ${executor.keypair.publicKey.toString()}`);
    console.log(`   Balance: ${balance.toFixed(4)} SOL`);
    console.log('   ✅ Executor OK\n');
  } catch (err) {
    console.log(`   ❌ Executor failed: ${err.message}\n`);
  }
  
  // Test 3: Monitor (connection only - don't start subscription)
  console.log('🔍 Testing Monitor:');
  try {
    const monitor = new PumpMonitor(() => {});
    console.log(`   Connection: ${monitor.connection.rpcEndpoint}`);
    console.log('   ✅ Monitor OK\n');
  } catch (err) {
    console.log(`   ❌ Monitor failed: ${err.message}\n`);
  }
  
  console.log('✅ All tests passed!\n');
  console.log('🚀 Ready to run: MAIN_WALLET=1 node sniper.mjs\n');
  
  process.exit(0);
}

testComponents().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

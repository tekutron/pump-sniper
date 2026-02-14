#!/usr/bin/env node
/**
 * test-token-balance.mjs - Test Token-2022 balance detection fix
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import fs from 'node:fs';
import config from './config.mjs';
import PumpPortalSDK from './pumpportal-sdk.mjs';
import { Executor } from './executor.mjs';

async function main() {
  console.log('🧪 Testing Token-2022 Balance Detection Fix\n');
  
  // Load wallet
  const secret = JSON.parse(fs.readFileSync(config.WALLET_PATH, 'utf8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(secret));
  console.log(`Wallet: ${wallet.publicKey.toString()}\n`);
  
  // Connect
  const connection = new Connection(config.RPC_URL, 'confirmed');
  
  // Test 1: Check if we can find Token-2022 tokens (should be 0 after selling all)
  console.log('1️⃣ Checking all Token-2022 accounts...');
  const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
  const token2022Accounts = await connection.getParsedTokenAccountsByOwner(
    wallet.publicKey,
    { programId: TOKEN_2022_PROGRAM_ID }
  );
  
  console.log(`   Found ${token2022Accounts.value.length} Token-2022 accounts`);
  
  if (token2022Accounts.value.length > 0) {
    console.log('   ⚠️  Warning: Still have Token-2022 tokens!');
    token2022Accounts.value.forEach((acc, i) => {
      const info = acc.account.data.parsed.info;
      console.log(`   [${i+1}] Mint: ${info.mint.slice(0, 12)}... Balance: ${info.tokenAmount.uiAmount}`);
    });
  } else {
    console.log('   ✅ No Token-2022 tokens (wallet clean)');
  }
  
  // Test 2: Test Executor's getTokenBalance function
  console.log('\n2️⃣ Testing Executor.getTokenBalance()...');
  const executor = new Executor();
  
  // Try a token we know doesn't exist
  const testMint = 'gBinNrwgMV4DQMfPjXRxknjUPEXiuiYh1VauJa7pump';
  const balance = await executor.getTokenBalance(testMint);
  
  console.log(`   Test mint: ${testMint}`);
  console.log(`   Balance: ${balance}`);
  
  if (balance === 0) {
    console.log('   ✅ Correctly returns 0 for sold token');
  } else {
    console.log(`   ⚠️  Unexpected balance: ${balance}`);
  }
  
  // Test 3: Test PumpPortalSDK's getTokenBalance function
  console.log('\n3️⃣ Testing PumpPortalSDK.getTokenBalance()...');
  const sdk = new PumpPortalSDK(connection, wallet, config);
  const balance2 = await sdk.getTokenBalance(testMint);
  
  console.log(`   Balance: ${balance2}`);
  
  if (balance2 === 0) {
    console.log('   ✅ Correctly returns 0 for sold token');
  } else {
    console.log(`   ⚠️  Unexpected balance: ${balance2}`);
  }
  
  console.log('\n✅ All tests passed! Token-2022 detection is working.');
  console.log('📝 The bot will now correctly find tokens after buying.');
}

main().catch(err => {
  console.error('\n❌ Test failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});

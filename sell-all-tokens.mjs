#!/usr/bin/env node
/**
 * sell-all-tokens.mjs - Emergency sell all tokens back to SOL
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import fs from 'node:fs';
import config from './config.mjs';
import PumpPortalSDK from './pumpportal-sdk.mjs';

async function main() {
  console.log('🔥 Selling all tokens back to SOL...\n');
  
  // Load wallet
  const secret = JSON.parse(fs.readFileSync(config.WALLET_PATH, 'utf8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(secret));
  console.log(`Wallet: ${wallet.publicKey.toString()}\n`);
  
  // Connect
  const connection = new Connection(config.RPC_URL, 'confirmed');
  const sdk = new PumpPortalSDK(connection, wallet, config);
  
  // Get all token accounts (Token-2022)
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    wallet.publicKey,
    { programId: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb') }
  );
  
  console.log(`Found ${tokenAccounts.value.length} token accounts\n`);
  
  if (tokenAccounts.value.length === 0) {
    console.log('✅ No tokens to sell - wallet is clean');
    return;
  }
  
  // Sell each token
  let sold = 0;
  let failed = 0;
  
  for (const account of tokenAccounts.value) {
    const info = account.account.data.parsed.info;
    const mint = info.mint;
    const balance = info.tokenAmount.uiAmount;
    
    if (balance <= 0) {
      console.log(`⏭️  Skipping ${mint.slice(0, 8)}... (zero balance)`);
      continue;
    }
    
    console.log(`\n💸 Selling ${mint.slice(0, 8)}...`);
    console.log(`   Balance: ${balance.toLocaleString()}`);
    
    try {
      // Sell 100% of holdings
      const signature = await sdk.sell(mint, 100, true);
      
      console.log(`   ✅ Sold! Tx: ${signature}`);
      sold++;
      
      // Wait 2s between sells to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   Sold: ${sold}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60));
  
  // Final balance
  const finalBalance = await connection.getBalance(wallet.publicKey);
  console.log(`\n💰 Final SOL balance: ${(finalBalance / 1e9).toFixed(6)} SOL`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

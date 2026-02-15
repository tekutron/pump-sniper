#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import config from './config.mjs';
import PumpPortalSDK from './pumpportal-sdk.mjs';

const STATE_FILE = './sniper_state.json';

async function closeAllPositions() {
  console.log('🔄 Closing all positions...\n');
  
  // Read state
  const state = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  const positions = state.activePositions || [];
  
  if (positions.length === 0) {
    console.log('✅ No open positions');
    return;
  }
  
  const sdk = new PumpPortalSDK();
  const connection = new Connection(config.RPC_URL);
  
  for (const [mint, position] of positions) {
    console.log(`\n💎 Closing position: ${mint.slice(0, 8)}...`);
    console.log(`   Entry: $${position.entryPrice.toFixed(8)}`);
    console.log(`   Entry time: ${new Date(position.entryTime).toLocaleTimeString()}`);
    
    try {
      // Get token account
      const tokenMintPk = new PublicKey(mint);
      const ata = await getAssociatedTokenAddress(
        tokenMintPk,
        config.WALLET_KEYPAIR.publicKey
      );
      
      // Check balance
      let tokenAccount;
      try {
        tokenAccount = await getAccount(connection, ata);
      } catch (err) {
        console.log(`   ⚠️ No token account found (already sold?)`);
        continue;
      }
      
      const balance = tokenAccount.amount;
      console.log(`   Token balance: ${balance.toString()}`);
      
      if (balance === 0n) {
        console.log(`   ⚠️ Balance is 0 (already sold?)`);
        continue;
      }
      
      // Sell tokens
      console.log(`   🔄 Selling ${balance.toString()} tokens...`);
      const result = await sdk.sellToken(mint, Number(balance), config.PRIORITY_FEE_SOL * 1e9);
      
      if (result.success) {
        console.log(`   ✅ Sold! Signature: ${result.signature}`);
        console.log(`   💰 SOL received: ${result.solReceived} SOL`);
        
        // Calculate P&L
        const solReceived = result.solReceived;
        const solSpent = position.amountSol;
        const pnl = ((solReceived - solSpent) / solSpent * 100).toFixed(2);
        console.log(`   📊 P&L: ${pnl}% (${solReceived.toFixed(4)} SOL vs ${solSpent.toFixed(4)} SOL)`);
      } else {
        console.log(`   ❌ Sell failed: ${result.error}`);
      }
      
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }
  }
  
  // Clear positions from state
  state.activePositions = [];
  state.running = false;
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  
  console.log('\n✅ All positions processed');
}

closeAllPositions().catch(console.error);

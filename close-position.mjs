#!/usr/bin/env node
import fs from 'fs';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import config from './config.mjs';
import PumpPortalSDK from './pumpportal-sdk.mjs';

const STATE_FILE = './sniper_state.json';

async function closeRemainingPositions() {
  console.log('🔄 Closing remaining positions...\n');
  
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  const positions = state.activePositions || [];
  
  if (positions.length === 0) {
    console.log('✅ No open positions');
    return;
  }
  
  // Load wallet
  const secret = JSON.parse(fs.readFileSync(config.WALLET_PATH, 'utf8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(secret));
  
  const connection = new Connection(config.RPC_URL);
  const sdk = new PumpPortalSDK(connection, wallet, config);
  
  for (const [mint, position] of positions) {
    console.log(`\n💎 Closing: ${mint.slice(0, 8)}...`);
    console.log(`   Entry: $${position.entryPrice}`);
    console.log(`   Hold: ${Math.floor((Date.now() - position.entryTime) / 1000)}s`);
    
    try {
      // Get token balance
      const tokenMintPk = new PublicKey(mint);
      const ata = await getAssociatedTokenAddress(
        tokenMintPk,
        wallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );
      
      const tokenAccount = await getAccount(connection, ata, 'confirmed', TOKEN_2022_PROGRAM_ID);
      const balance = tokenAccount.amount;
      
      console.log(`   Balance: ${balance.toString()} tokens`);
      
      if (balance === 0n) {
        console.log(`   ⚠️ Already sold`);
        continue;
      }
      
      // Sell via PumpPortal (100%)
      const signature = await sdk.sell(mint, 100, true);
      
      console.log(`   ✅ Sold! Tx: ${signature}`);
      
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }
  }
  
  // Clear state
  state.activePositions = [];
  state.running = false;
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  
  console.log('\n✅ Done');
}

closeRemainingPositions().catch(console.error);

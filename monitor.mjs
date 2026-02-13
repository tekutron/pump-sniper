#!/usr/bin/env node
/**
 * monitor.mjs - Pump.fun Launch Monitor
 * Watches for new token creation events via WebSocket
 */

import { Connection, PublicKey } from '@solana/web3.js';
import config from './config.mjs';

export class PumpMonitor {
  constructor(onNewToken) {
    this.connection = new Connection(config.RPC_URL, {
      wsEndpoint: config.RPC_WS_URL,
      commitment: 'confirmed'
    });
    this.onNewToken = onNewToken;
    this.subscriptionId = null;
    this.isRunning = false;
  }

  async start() {
    console.log('🔍 Starting Pump.fun monitor...');
    console.log(`   Program: ${config.PUMP_PROGRAM_ID}`);
    
    try {
      const programId = new PublicKey(config.PUMP_PROGRAM_ID);
      
      // Subscribe to logs for pump.fun program
      this.subscriptionId = this.connection.onLogs(
        programId,
        (logs, context) => {
          this.handleLog(logs, context);
        },
        'confirmed'
      );
      
      this.isRunning = true;
      console.log('✅ Monitor active - watching for new launches');
      
    } catch (err) {
      console.error('❌ Failed to start monitor:', err.message);
      throw err;
    }
  }

  async handleLog(logs, context) {
    try {
      const signature = logs.signature;
      
      // Check if this is a token creation
      const logMessages = logs.logs || [];
      const isCreate = logMessages.some(msg => 
        msg.includes('create') || 
        msg.includes('initialize') ||
        msg.includes('CreateToken')
      );
      
      if (!isCreate) return;
      
      console.log(`\n🎯 New token detected!`);
      console.log(`   Signature: ${signature}`);
      
      // Parse transaction to get token mint
      const tokenMint = await this.parseTokenMint(signature);
      
      if (tokenMint) {
        console.log(`   Token mint: ${tokenMint}`);
        
        // Notify callback
        if (this.onNewToken) {
          this.onNewToken({
            mint: tokenMint,
            signature: signature,
            slot: context.slot,
            timestamp: Date.now()
          });
        }
      }
      
    } catch (err) {
      console.error('Error handling log:', err.message);
    }
  }

  async parseTokenMint(signature) {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed'
      });
      
      if (!tx || !tx.meta) return null;
      
      // Look for new token accounts created
      const postTokenBalances = tx.meta.postTokenBalances || [];
      
      for (const balance of postTokenBalances) {
        // New token account with 0 balance usually indicates token creation
        if (balance.uiTokenAmount.uiAmount === 0) {
          return balance.mint;
        }
      }
      
      // Alternative: look in account keys for mint accounts
      const accounts = tx.transaction.message.accountKeys || [];
      
      // Try to find the token mint (heuristic: new account in position 1-3)
      for (let i = 1; i < Math.min(4, accounts.length); i++) {
        const account = accounts[i];
        if (account && account.pubkey) {
          // Basic validation: 32-byte pubkey
          const pubkey = account.pubkey.toString();
          if (pubkey.length >= 32) {
            return pubkey;
          }
        }
      }
      
      return null;
      
    } catch (err) {
      console.error('Error parsing transaction:', err.message);
      return null;
    }
  }

  async stop() {
    console.log('🛑 Stopping monitor...');
    
    if (this.subscriptionId !== null) {
      await this.connection.removeOnLogsListener(this.subscriptionId);
      this.subscriptionId = null;
    }
    
    this.isRunning = false;
    console.log('✅ Monitor stopped');
  }

  getStatus() {
    return {
      running: this.isRunning,
      subscription: this.subscriptionId !== null
    };
  }
}

export default PumpMonitor;

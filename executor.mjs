#!/usr/bin/env node
/**
 * executor.mjs - Buy/Sell Execution
 * Fast execution via PumpPortal API (native pump.fun bonding curve support)
 */

import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'node:fs';
import config from './config.mjs';
import PumpPortalSDK from './pumpportal-sdk.mjs';
import { RPCManager } from './rpc-manager.mjs';

export class Executor {
  constructor() {
    this.rpcManager = new RPCManager();
    this.connection = this.rpcManager.getPrimaryConnection(); // Primary for balance checks
    this.keypair = this.loadWallet();
    this.pumpPortalSDK = new PumpPortalSDK(this.connection, this.keypair, config);
  }

  loadWallet() {
    const secret = JSON.parse(fs.readFileSync(config.WALLET_PATH, 'utf8'));
    return Keypair.fromSecretKey(Uint8Array.from(secret));
  }

  async getBalance() {
    const balance = await this.connection.getBalance(this.keypair.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Buy token via PumpPortal API
   */
  async buyToken(tokenMint) {
    console.log(`\n💰 Executing PUMPPORTAL BUY for ${tokenMint.slice(0, 8)}...`);
    
    const startTime = Date.now();
    
    try {
      const signature = await this.pumpPortalSDK.buy(
        tokenMint,
        config.POSITION_SIZE_SOL
      );
      
      const executionTimeMs = Date.now() - startTime;
      console.log(`✅ Buy executed in ${executionTimeMs}ms`);
      
      return {
        success: true,
        signature: signature,
        executionTimeMs: executionTimeMs,
        mint: tokenMint
      };
      
    } catch (err) {
      console.error(`❌ Buy failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        mint: tokenMint
      };
    }
  }

  /**
   * Sell token via PumpPortal API
   */
  async sellToken(tokenMint, tokenAmount) {
    console.log(`\n💸 Executing PUMPPORTAL SELL for ${tokenMint.slice(0, 8)}...`);
    
    const startTime = Date.now();
    
    try {
      // If tokenAmount is null/undefined, sell 100% of holdings
      const sellPercent = !tokenAmount;
      const amount = sellPercent ? 100 : tokenAmount;
      
      if (sellPercent) {
        console.log(`   📊 Selling 100% of holdings`);
      }
      
      const signature = await this.pumpPortalSDK.sell(
        tokenMint,
        amount,
        sellPercent
      );
      
      const executionTimeMs = Date.now() - startTime;
      console.log(`✅ Sell executed in ${executionTimeMs}ms`);
      
      return {
        success: true,
        signature: signature,
        executionTimeMs: executionTimeMs,
        mint: tokenMint
      };
      
    } catch (err) {
      console.error(`❌ Sell failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        mint: tokenMint
      };
    }
  }

  /**
   * Get token price (placeholder - not implemented yet)
   * Jupiter doesn't provide price API, would need DexScreener or other source
   */
  async getTokenPrice(tokenMint) {
    // Not implemented - bot uses timeout-based exits for now
    return null;
  }

  /**
   * Get token balance for wallet
   */
  async getTokenBalance(tokenMint) {
    try {
      const mintPubkey = new PublicKey(tokenMint);
      const ata = await getAssociatedTokenAddress(
        mintPubkey,
        this.keypair.publicKey,
        false,
        TOKEN_PROGRAM_ID
      );
      
      const balance = await this.connection.getTokenAccountBalance(ata);
      return parseFloat(balance.value.uiAmount || 0);
      
    } catch (err) {
      return 0;
    }
  }
}

export default Executor;

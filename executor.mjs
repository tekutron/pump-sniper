#!/usr/bin/env node
/**
 * executor.mjs - Buy/Sell Execution
 * Fast execution via Jupiter Ultra (supports pump.fun bonding curve)
 */

import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'node:fs';
import config from './config.mjs';
import { JupiterSDK } from './jupiter-sdk.mjs';
import { RPCManager } from './rpc-manager.mjs';

export class Executor {
  constructor() {
    this.rpcManager = new RPCManager();
    this.connection = this.rpcManager.getPrimaryConnection(); // Primary for balance checks
    this.keypair = this.loadWallet();
    this.jupiterSDK = new JupiterSDK(this.rpcManager, this.keypair);
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
   * Buy token via Jupiter Aggregator
   */
  async buyToken(tokenMint) {
    console.log(`\n💰 Executing JUPITER BUY for ${tokenMint.slice(0, 8)}...`);
    
    try {
      const priorityFeeLamports = config.PRIORITY_FEE_SOL * LAMPORTS_PER_SOL;
      const slippageBps = 1000; // 10% slippage (new tokens are volatile)
      
      const result = await this.jupiterSDK.buyToken(
        tokenMint,
        config.POSITION_SIZE_SOL,
        slippageBps,
        priorityFeeLamports
      );
      
      if (result.success) {
        console.log(`✅ Buy executed in ${result.executionTimeMs}ms`);
        console.log(`   Signature: ${result.signature}`);
      }
      
      return result;
      
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
   * Sell token via Jupiter Aggregator
   */
  async sellToken(tokenMint, tokenAmount) {
    console.log(`\n💸 Executing JUPITER SELL for ${tokenMint.slice(0, 8)}...`);
    
    try {
      const priorityFeeLamports = config.PRIORITY_FEE_SOL * LAMPORTS_PER_SOL;
      
      // If tokenAmount is null/undefined, get actual balance
      if (!tokenAmount) {
        tokenAmount = await this.getTokenBalance(tokenMint);
        console.log(`   📊 Auto-detected balance: ${tokenAmount} tokens`);
      }
      
      const result = await this.jupiterSDK.sellToken(
        tokenMint,
        tokenAmount,
        priorityFeeLamports
      );
      
      if (result.success) {
        console.log(`✅ Sell executed in ${result.executionTimeMs}ms`);
        console.log(`   Signature: ${result.signature}`);
      }
      
      return result;
      
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

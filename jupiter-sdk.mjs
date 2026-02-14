#!/usr/bin/env node
/**
 * jupiter-sdk.mjs - Jupiter Aggregator Integration
 * Reliable swap execution for pump sniper
 */

import {
  Transaction,
  VersionedTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';

const JUPITER_API_URL = 'https://quote-api.jup.ag/v6';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

export class JupiterSDK {
  constructor(rpcManagerOrConnection, wallet) {
    // Support both RPCManager and raw Connection
    if (rpcManagerOrConnection.getPrimaryConnection) {
      this.rpcManager = rpcManagerOrConnection;
      this.connection = this.rpcManager.getPrimaryConnection();
    } else {
      this.connection = rpcManagerOrConnection;
      this.rpcManager = null;
    }
    this.wallet = wallet;
  }

  /**
   * Buy tokens using Jupiter aggregator
   */
  async buyToken(mintAddress, solAmount, slippageBps = 1000, priorityFeeLamports = 1_000_000) {
    console.log(`\n🚀 Building JUPITER BUY transaction...`);
    console.log(`   Mint: ${mintAddress}`);
    console.log(`   Amount: ${solAmount} SOL`);
    console.log(`   Slippage: ${slippageBps / 100}%`);

    try {
      const startTime = Date.now();
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

      // Step 1: Get quote
      console.log(`   📊 Getting quote from Jupiter...`);
      const quoteResponse = await fetch(
        `${JUPITER_API_URL}/quote?` +
        `inputMint=${SOL_MINT}&` +
        `outputMint=${mintAddress}&` +
        `amount=${lamports}&` +
        `slippageBps=${slippageBps}`
      );

      if (!quoteResponse.ok) {
        throw new Error(`Jupiter quote failed: ${quoteResponse.status}`);
      }

      const quoteData = await quoteResponse.json();

      // Step 2: Get swap transaction
      console.log(`   🔨 Building swap transaction...`);
      const swapResponse = await fetch(`${JUPITER_API_URL}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: this.wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: priorityFeeLamports
        })
      });

      if (!swapResponse.ok) {
        throw new Error(`Jupiter swap failed: ${swapResponse.status}`);
      }

      const { swapTransaction } = await swapResponse.json();

      // Step 3: Deserialize and sign transaction
      const transactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuf);
      transaction.sign([this.wallet]);

      // Step 4: Send transaction
      console.log(`   📤 Sending transaction...`);
      const signature = await this.connection.sendTransaction(transaction, {
        skipPreflight: true,
        maxRetries: 3
      });

      const elapsed = Date.now() - startTime;
      console.log(`   ⚡ Transaction sent in ${elapsed}ms`);
      console.log(`   🔗 Signature: ${signature}`);

      return {
        success: true,
        signature,
        mint: mintAddress,
        amountSol: solAmount,
        timestamp: Date.now(),
        executionTimeMs: elapsed
      };

    } catch (err) {
      console.error(`   ❌ Jupiter buy failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        mint: mintAddress
      };
    }
  }

  /**
   * Sell tokens using Jupiter aggregator
   */
  async sellToken(mintAddress, tokenAmount, priorityFeeLamports = 1_000_000) {
    console.log(`\n💰 Building JUPITER SELL transaction...`);
    console.log(`   Mint: ${mintAddress}`);
    console.log(`   Amount: ${tokenAmount} tokens (approx)`);

    try {
      const startTime = Date.now();
      
      // Use a rough estimate for token amount (Jupiter will use actual balance)
      const amount = Math.floor(tokenAmount * 1e9); // Assume 9 decimals

      // Step 1: Get quote
      console.log(`   📊 Getting quote from Jupiter...`);
      const quoteResponse = await fetch(
        `${JUPITER_API_URL}/quote?` +
        `inputMint=${mintAddress}&` +
        `outputMint=${SOL_MINT}&` +
        `amount=${amount}&` +
        `slippageBps=1000` // 10% slippage
      );

      if (!quoteResponse.ok) {
        throw new Error(`Jupiter quote failed: ${quoteResponse.status}`);
      }

      const quoteData = await quoteResponse.json();

      // Step 2: Get swap transaction
      console.log(`   🔨 Building swap transaction...`);
      const swapResponse = await fetch(`${JUPITER_API_URL}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: this.wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: priorityFeeLamports
        })
      });

      if (!swapResponse.ok) {
        throw new Error(`Jupiter swap failed: ${swapResponse.status}`);
      }

      const { swapTransaction } = await swapResponse.json();

      // Step 3: Deserialize and sign transaction
      const transactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuf);
      transaction.sign([this.wallet]);

      // Step 4: Send transaction
      console.log(`   📤 Sending transaction...`);
      const signature = await this.connection.sendTransaction(transaction, {
        skipPreflight: true,
        maxRetries: 3
      });

      const elapsed = Date.now() - startTime;
      console.log(`   ⚡ Transaction sent in ${elapsed}ms`);
      console.log(`   🔗 Signature: ${signature}`);

      return {
        success: true,
        signature,
        mint: mintAddress,
        timestamp: Date.now(),
        executionTimeMs: elapsed
      };

    } catch (err) {
      console.error(`   ❌ Jupiter sell failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        mint: mintAddress
      };
    }
  }
}

export default JupiterSDK;

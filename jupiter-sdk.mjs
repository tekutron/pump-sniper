#!/usr/bin/env node
/**
 * jupiter-sdk.mjs - Jupiter Ultra Integration
 * Supports fresh pump.fun tokens via Jupiter Ultra
 */

import {
  VersionedTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import './load-env.mjs';

// Jupiter Ultra endpoints (supports pump.fun bonding curve)
const JUPITER_QUOTE_API = 'https://ultra.jup.ag/quote';
const JUPITER_SWAP_API = 'https://ultra.jup.ag/swap';
const JUPITER_API_KEY = process.env.JUPITER_API_KEY || '';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

console.log('🚀 Jupiter Ultra SDK initialized:', JUPITER_API_KEY ? 'API Key ✅' : 'No API Key ❌');

export class JupiterSDK {
  constructor(rpcManagerOrConnection, wallet) {
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
   * Buy tokens using Jupiter Ultra (supports pump.fun)
   */
  async buyToken(mintAddress, solAmount, slippageBps = 1000, priorityFeeLamports = 1_000_000) {
    console.log(`\n🚀 Building JUPITER ULTRA BUY...`);
    console.log(`   Mint: ${mintAddress}`);
    console.log(`   Amount: ${solAmount} SOL`);
    console.log(`   Slippage: ${slippageBps / 100}%`);

    try {
      const startTime = Date.now();
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

      // Step 1: Get quote from Jupiter Ultra
      console.log(`   📊 Getting quote from Jupiter Ultra...`);
      const quoteResponse = await fetch(
        `${JUPITER_QUOTE_API}?` +
        `inputMint=${SOL_MINT}&` +
        `outputMint=${mintAddress}&` +
        `amount=${lamports}&` +
        `slippageBps=${slippageBps}`,
        {
          headers: {
            'X-API-KEY': JUPITER_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!quoteResponse.ok) {
        const errorText = await quoteResponse.text();
        throw new Error(`Jupiter Ultra quote failed (${quoteResponse.status}): ${errorText}`);
      }

      const quoteData = await quoteResponse.json();
      console.log(`   ✅ Quote received`);

      // Step 2: Get swap transaction
      console.log(`   🔨 Building swap transaction...`);
      const swapResponse = await fetch(JUPITER_SWAP_API, {
        method: 'POST',
        headers: {
          'X-API-KEY': JUPITER_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: this.wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: priorityFeeLamports
        })
      });

      if (!swapResponse.ok) {
        const errorText = await swapResponse.text();
        throw new Error(`Jupiter Ultra swap failed (${swapResponse.status}): ${errorText}`);
      }

      const { swapTransaction } = await swapResponse.json();
      console.log(`   ✅ Swap transaction built`);

      // Step 3: Deserialize and sign
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
      console.error(`   ❌ Jupiter Ultra buy failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        mint: mintAddress
      };
    }
  }

  /**
   * Sell tokens using Jupiter Ultra
   */
  async sellToken(mintAddress, tokenAmount, priorityFeeLamports = 1_000_000) {
    console.log(`\n💰 Building JUPITER ULTRA SELL...`);
    console.log(`   Mint: ${mintAddress}`);
    console.log(`   Amount: ~${tokenAmount} tokens`);

    try {
      const startTime = Date.now();
      const amount = Math.floor(tokenAmount * 1e9); // Assume 9 decimals

      // Step 1: Get quote
      console.log(`   📊 Getting quote from Jupiter Ultra...`);
      const quoteResponse = await fetch(
        `${JUPITER_QUOTE_API}?` +
        `inputMint=${mintAddress}&` +
        `outputMint=${SOL_MINT}&` +
        `amount=${amount}&` +
        `slippageBps=1000`,
        {
          headers: {
            'X-API-KEY': JUPITER_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!quoteResponse.ok) {
        const errorText = await quoteResponse.text();
        throw new Error(`Jupiter Ultra quote failed (${quoteResponse.status}): ${errorText}`);
      }

      const quoteData = await quoteResponse.json();
      console.log(`   ✅ Quote received`);

      // Step 2: Get swap transaction
      console.log(`   🔨 Building swap transaction...`);
      const swapResponse = await fetch(JUPITER_SWAP_API, {
        method: 'POST',
        headers: {
          'X-API-KEY': JUPITER_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: this.wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: priorityFeeLamports
        })
      });

      if (!swapResponse.ok) {
        const errorText = await swapResponse.text();
        throw new Error(`Jupiter Ultra swap failed (${swapResponse.status}): ${errorText}`);
      }

      const { swapTransaction } = await swapResponse.json();
      console.log(`   ✅ Swap transaction built`);

      // Step 3: Deserialize and sign
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
      console.error(`   ❌ Jupiter Ultra sell failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        mint: mintAddress
      };
    }
  }
}

export default JupiterSDK;

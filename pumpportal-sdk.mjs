#!/usr/bin/env node
/**
 * pumpportal-sdk.mjs - PumpPortal API Integration
 * Simple pump.fun trading via PumpPortal's Lightning API
 */

import './load-env.mjs';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const PUMPPORTAL_API = 'https://pumpportal.fun/api/trade';
const PUMPPORTAL_API_KEY = process.env.PUMPPORTAL_API_KEY || '';

console.log('🎯 PumpPortal SDK initialized:', PUMPPORTAL_API_KEY ? 'API Key ✅' : 'No API Key ❌');

export class PumpPortalSDK {
  constructor(rpcManagerOrConnection, wallet) {
    // We don't actually need these for PumpPortal API
    // but keep interface compatible
    this.wallet = wallet;
    this.connection = rpcManagerOrConnection.getPrimaryConnection ?
      rpcManagerOrConnection.getPrimaryConnection() :
      rpcManagerOrConnection;
  }

  /**
   * Buy tokens via PumpPortal API (pump.fun bonding curve)
   */
  async buyToken(mintAddress, solAmount, slippageBps = 1000, priorityFeeLamports = 1_000_000) {
    console.log(`\n🚀 Building PUMPPORTAL BUY...`);
    console.log(`   Mint: ${mintAddress}`);
    console.log(`   Amount: ${solAmount} SOL`);
    console.log(`   Slippage: ${slippageBps / 100}%`);

    try {
      const startTime = Date.now();
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
      const priorityFeeSol = priorityFeeLamports / LAMPORTS_PER_SOL;

      console.log(`   📤 Sending to PumpPortal API...`);
      
      const response = await fetch(
        `${PUMPPORTAL_API}?api-key=${PUMPPORTAL_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'buy',
            mint: mintAddress,
            amount: lamports,
            denominatedInSol: 'true',
            slippage: slippageBps / 100, // Convert bps to percent
            priorityFee: priorityFeeSol,
            pool: 'pump' // Use pump.fun bonding curve
          })
        }
      );

      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PumpPortal API failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      // PumpPortal returns transaction signature or error
      if (data.error) {
        throw new Error(`PumpPortal error: ${data.error}`);
      }

      const signature = data.signature || data;
      
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
      console.error(`   ❌ PumpPortal buy failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        mint: mintAddress
      };
    }
  }

  /**
   * Sell tokens via PumpPortal API
   */
  async sellToken(mintAddress, tokenAmount, priorityFeeLamports = 1_000_000) {
    console.log(`\n💰 Building PUMPPORTAL SELL...`);
    console.log(`   Mint: ${mintAddress}`);
    console.log(`   Amount: ~${tokenAmount} tokens`);

    try {
      const startTime = Date.now();
      const priorityFeeSol = priorityFeeLamports / LAMPORTS_PER_SOL;
      
      // For sell, we need to specify token amount (not SOL)
      const tokenAmountRaw = Math.floor(tokenAmount * 1e9); // Assume 9 decimals

      console.log(`   📤 Sending to PumpPortal API...`);
      
      const response = await fetch(
        `${PUMPPORTAL_API}?api-key=${PUMPPORTAL_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'sell',
            mint: mintAddress,
            amount: tokenAmountRaw,
            denominatedInSol: 'false', // Selling tokens, not SOL
            slippage: 10, // 10% slippage
            priorityFee: priorityFeeSol,
            pool: 'pump'
          })
        }
      );

      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PumpPortal API failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`PumpPortal error: ${data.error}`);
      }

      const signature = data.signature || data;
      
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
      console.error(`   ❌ PumpPortal sell failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        mint: mintAddress
      };
    }
  }
}

export default PumpPortalSDK;

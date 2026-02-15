#!/usr/bin/env node
/**
 * executor.mjs - Buy/Sell Execution
 * Fast execution via PumpPortal API (native pump.fun bonding curve support)
 */

import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fs from 'node:fs';
import fetch from 'node-fetch';
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
    try {
      // Try Bitquery first (works for bonding curve + graduated)
      const bitqueryPrice = await this.getBitqueryPrice(tokenMint);
      if (bitqueryPrice) {
        return bitqueryPrice;
      }
      
      // Fallback to DexScreener (graduated tokens only)
      const dexscreenerPrice = await this.getDexScreenerPrice(tokenMint);
      if (dexscreenerPrice) {
        return dexscreenerPrice;
      }
      
      return null;
      
    } catch (err) {
      console.error(`   ⚠️ Price fetch error: ${err.message}`);
      return null;
    }
  }
  
  async getBitqueryPrice(tokenMint) {
    try {
      const query = `
      {
        Trading {
          Pairs(
            where: {
              Token: { Address: { is: "${tokenMint}" } }
              Price: { IsQuotedInUsd: true }
              Market: {
                Network: { is: "Solana" }
                Program: { is: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P" }
              }
            }
            limit: { count: 1 }
            orderBy: { descending: Block_Time }
          ) {
            Price {
              Ohlc {
                Close
              }
            }
            Volume {
              Usd
            }
          }
        }
      }`;
      
      const response = await fetch('https://streaming.bitquery.io/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': '9c90d9c9-7876-4ada-ab09-8a9b3385cdd6'
        },
        body: JSON.stringify({ query }),
        timeout: 3000
      });
      
      if (!response.ok) {
        return null;
      }
      
      const result = await response.json();
      
      if (result.data?.Trading?.Pairs?.length > 0) {
        const pair = result.data.Trading.Pairs[0];
        const price = pair.Price?.Ohlc?.Close;
        
        if (price && price > 0) {
          return {
            price: price,
            timestamp: Date.now(),
            source: 'bitquery',
            volume: pair.Volume?.Usd || 0
          };
        }
      }
      
      return null;
      
    } catch (err) {
      // Silently fail, will try DexScreener
      return null;
    }
  }
  
  async getDexScreenerPrice(tokenMint) {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`, {
        timeout: 3000
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      if (!data.pairs || data.pairs.length === 0) {
        return null;
      }
      
      const pair = data.pairs[0];
      const priceUsd = parseFloat(pair.priceUsd) || 0;
      
      if (priceUsd > 0) {
        return {
          price: priceUsd,
          timestamp: Date.now(),
          source: 'dexscreener',
          liquidity: pair.liquidity?.usd || 0
        };
      }
      
      return null;
      
    } catch (err) {
      return null;
    }
  }

  /**
   * Get token balance for wallet
   * Checks both Token Program and Token-2022 Program (pump.fun uses Token-2022)
   */
  async getTokenBalance(tokenMint) {
    try {
      const mintPubkey = new PublicKey(tokenMint);
      
      // Try Token-2022 first (pump.fun uses this)
      try {
        const ata2022 = await getAssociatedTokenAddress(
          mintPubkey,
          this.keypair.publicKey,
          false,
          TOKEN_2022_PROGRAM_ID
        );
        
        const balance2022 = await this.connection.getTokenAccountBalance(ata2022);
        const amount = parseFloat(balance2022.value.uiAmount || 0);
        if (amount > 0) {
          return amount;
        }
      } catch (err) {
        // Token-2022 ATA doesn't exist, try standard
      }
      
      // Fallback to standard Token Program
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

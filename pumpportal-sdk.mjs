/**
 * pumpportal-sdk.mjs - PumpPortal Local Transaction API Integration
 * Uses PumpPortal to build transactions, we sign and send them ourselves
 */

import { VersionedTransaction, PublicKey } from '@solana/web3.js';
import fetch from 'node-fetch';

export default class PumpPortalSDK {
  constructor(connection, wallet, config) {
    this.connection = connection;
    this.wallet = wallet;
    this.config = config;
    this.apiUrl = 'https://pumpportal.fun/api/trade-local';
  }

  /**
   * Buy tokens using PumpPortal
   * @param {string} tokenMint - Token mint address
   * @param {number} amountSol - Amount of SOL to spend
   * @returns {Promise<string>} Transaction signature
   */
  async buy(tokenMint, amountSol) {
    console.log(`\n📦 Building buy transaction via PumpPortal...`);
    console.log(`   Token: ${tokenMint}`);
    console.log(`   Amount: ${amountSol} SOL`);

    try {
      // Request transaction from PumpPortal
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: this.wallet.publicKey.toString(),
          action: 'buy',
          mint: tokenMint,
          amount: amountSol,
          denominatedInSol: 'true',
          slippage: this.config.SLIPPAGE_BPS / 100, // Convert BPS to percent
          priorityFee: this.config.PRIORITY_FEE_SOL,
          pool: 'pump' // Trade on pump.fun bonding curve
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PumpPortal API error: ${response.status} ${errorText}`);
      }

      // Response is serialized transaction bytes
      const txBytes = await response.arrayBuffer();
      
      // Deserialize transaction
      const tx = VersionedTransaction.deserialize(new Uint8Array(txBytes));
      
      // Sign transaction with our wallet
      tx.sign([this.wallet]);
      
      console.log(`   ✅ Transaction built and signed`);
      
      // Send transaction with high priority
      const signature = await this.connection.sendTransaction(tx, {
        skipPreflight: this.config.SKIP_PREFLIGHT,
        maxRetries: 3
      });

      console.log(`   📤 Transaction sent: ${signature}`);
      
      return signature;

    } catch (err) {
      console.error(`   ❌ Buy failed:`, err.message);
      throw err;
    }
  }

  /**
   * Sell tokens using PumpPortal
   * @param {string} tokenMint - Token mint address
   * @param {number} tokenAmount - Amount of tokens to sell (or percentage if percent=true)
   * @param {boolean} percent - If true, sell tokenAmount% of holdings
   * @returns {Promise<string>} Transaction signature
   */
  async sell(tokenMint, tokenAmount, percent = false) {
    console.log(`\n📦 Building sell transaction via PumpPortal...`);
    console.log(`   Token: ${tokenMint}`);
    console.log(`   Amount: ${percent ? `${tokenAmount}%` : tokenAmount}`);

    try {
      // Get token balance if selling by percentage
      let actualAmount = tokenAmount;
      if (percent) {
        const tokenBalance = await this.getTokenBalance(tokenMint);
        actualAmount = Math.floor(tokenBalance * (tokenAmount / 100));
        console.log(`   Token balance: ${tokenBalance}`);
        console.log(`   Selling: ${actualAmount} tokens`);
      }

      // Request transaction from PumpPortal
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: this.wallet.publicKey.toString(),
          action: 'sell',
          mint: tokenMint,
          amount: actualAmount,
          denominatedInSol: 'false', // Selling tokens, not SOL
          slippage: this.config.SLIPPAGE_BPS / 100,
          priorityFee: this.config.PRIORITY_FEE_SOL,
          pool: 'pump'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PumpPortal API error: ${response.status} ${errorText}`);
      }

      // Response is serialized transaction bytes
      const txBytes = await response.arrayBuffer();
      
      // Deserialize transaction
      const tx = VersionedTransaction.deserialize(new Uint8Array(txBytes));
      
      // Sign transaction with our wallet
      tx.sign([this.wallet]);
      
      console.log(`   ✅ Transaction built and signed`);
      
      // Send transaction
      const signature = await this.connection.sendTransaction(tx, {
        skipPreflight: this.config.SKIP_PREFLIGHT,
        maxRetries: 3
      });

      console.log(`   📤 Transaction sent: ${signature}`);
      
      return signature;

    } catch (err) {
      console.error(`   ❌ Sell failed:`, err.message);
      throw err;
    }
  }

  /**
   * Get token balance
   * Checks both Token Program and Token-2022 Program (pump.fun uses Token-2022)
   */
  async getTokenBalance(tokenMint) {
    try {
      // Check Token-2022 first (pump.fun uses this)
      const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
      
      const token2022Accounts = await this.connection.getParsedTokenAccountsByOwner(
        this.wallet.publicKey,
        { 
          mint: new PublicKey(tokenMint),
          programId: TOKEN_2022_PROGRAM_ID
        }
      );

      if (token2022Accounts.value.length > 0) {
        const balance = token2022Accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        return balance || 0;
      }

      // Fallback to standard Token Program
      const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.wallet.publicKey,
        { 
          mint: new PublicKey(tokenMint),
          programId: TOKEN_PROGRAM_ID
        }
      );

      if (tokenAccounts.value.length === 0) {
        return 0;
      }

      const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
      return balance || 0;

    } catch (err) {
      console.error(`Failed to get token balance:`, err.message);
      return 0;
    }
  }
}

#!/usr/bin/env node
/**
 * config.mjs - Pump Sniper Configuration
 */

import './load-env.mjs';

export const config = {
  // Pump.fun program ID (bonding curve)
  PUMP_PROGRAM_ID: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  
  // Trading parameters (TP/SL ONLY - Feb 15 2026 v5)
  POSITION_SIZE_SOL: 0.01,  // SMALL TEST: 0.01 SOL (change to 0.05 for full live)
  TAKE_PROFIT_PCT: 10,      // 10% profit target (Feb 15 14:43)
  STOP_LOSS_PCT: 10,        // 10% stop loss (Feb 15 14:43 - 1:1 ratio)
  // MAX_HOLD_TIME removed - only TP/SL exits (no timeout)
  
  // Execution
  PRIORITY_FEE_SOL: 0.0005, // Medium priority (balance speed/cost)
  SLIPPAGE_BPS: 500,        // 5% slippage (Feb 15 14:43)
  PRICE_POLL_MS: 1000,      // Check price every 1s (avoid rate limits!)
  
  // RPC (load from .env)
  RPC_URL: process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
  RPC_WS_URL: (process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC || '')?.replace('https://', 'wss://').replace('http://', 'ws://') || null,
  
  // Price APIs
  MORALIS_API_KEY: process.env.MORALIS_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjU4MTZlYzJmLTM4ZWItNDRkMy1hMWExLWI5NTZjZTMyYzhkMyIsIm9yZ0lkIjoiNTAwNzk1IiwidXNlcklkIjoiNTE1Mjk0IiwidHlwZUlkIjoiYzYyZTU4MTctMDIzZi00Y2I2LWEzNjQtNjk4NzE3MTg0Yzc5IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NzExOTQ3MDYsImV4cCI6NDkyNjk1NDcwNn0.Mpak3-USUBjZ4Rep1yhuEyNyzLh3Zzjc4ASirLEhVME',
  
  // Wallet (dedicated pump-sniper wallet)
  WALLET_PATH: './wallets/pump_sniper_wallet.json',
  
  // State files
  STATE_FILE: './sniper_state.json',
  TRADES_FILE: './sniper_trades.json',
  
  // Safety
  MAX_CONCURRENT_SNIPES: 1,  // One at a time for now
  MIN_BALANCE_SOL: 0.05,     // Keep reserve (lowered for testing)
  
  // Safety Filters (BONDING CURVE MODE - Feb 14 2026)
  ENABLE_SAFETY_FILTERS: true,           // Enable pre-buy safety checks
  MIN_SAFETY_SCORE: 1,                   // Minimum composite safety score (0-100) [ULTRA: accept almost anything]
  MIN_RUGCHECK_SCORE: 1,                 // Minimum RugCheck score [ULTRA: 1/100 minimum]
  MIN_LIQUIDITY_USD: 100,                // Minimum liquidity in USD [Only for GRADUATED tokens]
  REQUIRE_SOCIALS: true,                 // Require social presence (twitter/website) [ENABLED Feb 14]
  AGE_FILTER_SECONDS: 1,                 // Wait 1s after launch [ULTRA FAST - Feb 14 22:34]
  SKIP_GOPLUS: true,                     // Skip GoPlus API check (removed)
  // NOTE: Bonding curve tokens skip DEX liquidity checks - they trade directly on pump.fun
  
  // Dry-run mode (monitor only, no buys)
  DRY_RUN: process.env.DRY_RUN === 'true' || process.env.DRY_RUN === '1',
};

export default config;

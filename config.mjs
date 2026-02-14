#!/usr/bin/env node
/**
 * config.mjs - Pump Sniper Configuration
 */

import './load-env.mjs';

export const config = {
  // Pump.fun program ID (bonding curve)
  PUMP_PROGRAM_ID: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  
  // Trading parameters
  POSITION_SIZE_SOL: 0.01,  // SMALL TEST: 0.01 SOL (change to 0.05 for full live)
  TAKE_PROFIT_PCT: 10,      // 10% profit target
  MAX_HOLD_TIME_MS: 180000, // 3 minutes max hold (180 seconds)
  
  // Execution
  PRIORITY_FEE_SOL: 0.001,  // High priority for speed
  SLIPPAGE_BPS: 1000,       // 10% slippage
  PRICE_POLL_MS: 1000,      // Check price every 1s (avoid rate limits!)
  
  // RPC (load from .env)
  RPC_URL: process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
  RPC_WS_URL: (process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC || '')?.replace('https://', 'wss://').replace('http://', 'ws://') || null,
  
  // Wallet (dedicated pump-sniper wallet)
  WALLET_PATH: './wallets/pump_sniper_wallet.json',
  
  // State files
  STATE_FILE: './sniper_state.json',
  TRADES_FILE: './sniper_trades.json',
  
  // Safety
  MAX_CONCURRENT_SNIPES: 1,  // One at a time for now
  MIN_BALANCE_SOL: 0.1,      // Keep reserve
  
  // Safety Filters (NEW)
  ENABLE_SAFETY_FILTERS: true,           // Enable pre-buy safety checks
  MIN_SAFETY_SCORE: 50,                  // Minimum composite safety score (0-100) [lowered from 60]
  MIN_RUGCHECK_SCORE: 40,                // Minimum RugCheck score [lowered from 50]
  MIN_LIQUIDITY_USD: 900,                // Minimum liquidity in USD [lowered from 1000]
  REQUIRE_SOCIALS: false,                // Require social presence (twitter/website)
  
  // Dry-run mode (monitor only, no buys)
  DRY_RUN: process.env.DRY_RUN === 'true' || process.env.DRY_RUN === '1',
};

export default config;

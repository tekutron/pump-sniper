#!/usr/bin/env node
/**
 * sniper.mjs - Main Pump Sniper Bot
 * Detects new pump.fun launches → Buy instantly → Sell at +10% or 10s
 */

import fs from 'node:fs';
import PumpMonitor from './monitor.mjs';
import Executor from './executor.mjs';
import config from './config.mjs';

class PumpSniper {
  constructor() {
    this.monitor = null;
    this.executor = null;
    this.activePositions = new Map();
    this.trades = [];
    this.isRunning = false;
    
    this.stats = {
      detected: 0,
      executed: 0,
      wins: 0,
      timeouts: 0,
      failed: 0
    };
  }

  async start() {
    console.log('🎯 Pump Sniper Starting...\n');
    
    if (config.DRY_RUN) {
      console.log('🧪 DRY-RUN MODE: Monitoring only, no real trades\n');
    }
    
    console.log('Strategy:');
    console.log(`  Position: ${config.POSITION_SIZE_SOL} SOL`);
    console.log(`  Take Profit: +${config.TAKE_PROFIT_PCT}%`);
    console.log(`  Max Hold: ${config.MAX_HOLD_TIME_MS / 1000}s`);
    console.log(`  Priority Fee: ${config.PRIORITY_FEE_SOL} SOL\n`);
    
    // Check wallet balance
    this.executor = new Executor();
    const balance = await this.executor.getBalance();
    console.log(`💰 Wallet Balance: ${balance.toFixed(4)} SOL\n`);
    
    if (balance < config.MIN_BALANCE_SOL) {
      throw new Error(`Insufficient balance (need ${config.MIN_BALANCE_SOL} SOL minimum)`);
    }
    
    // Start monitor
    this.monitor = new PumpMonitor((token) => this.handleNewToken(token));
    await this.monitor.start();
    
    this.isRunning = true;
    console.log('\n🚀 Sniper active - waiting for launches...\n');
    
    // Save state periodically
    setInterval(() => this.saveState(), 5000);
    
    // Auto-stop for dry-run tests (if DRY_RUN_MINUTES is set)
    if (config.DRY_RUN && process.env.DRY_RUN_MINUTES) {
      const minutes = parseInt(process.env.DRY_RUN_MINUTES);
      console.log(`⏱️  Auto-stop scheduled in ${minutes} minute(s)\n`);
      
      setTimeout(async () => {
        console.log(`\n⏱️  ${minutes} minute test complete!\n`);
        await this.printReport();
        await this.stop();
        process.exit(0);
      }, minutes * 60 * 1000);
    }
  }
  
  async printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SIMULATION REPORT');
    console.log('='.repeat(60));
    console.log(`\n📈 Session Stats:`);
    console.log(`   Total Detected: ${this.stats.detected}`);
    console.log(`   Total Executed: ${this.stats.executed}`);
    console.log(`   Wins (TP hit): ${this.stats.wins}`);
    console.log(`   Timeouts: ${this.stats.timeouts}`);
    console.log(`   Failed: ${this.stats.failed}`);
    
    const winRate = this.stats.executed > 0 ? (this.stats.wins / this.stats.executed * 100) : 0;
    console.log(`   Win Rate: ${winRate.toFixed(1)}%`);
    
    // Calculate estimated P&L (rough approximation)
    const avgWinPnl = 10; // TP at +10%
    const avgLossPnl = -2; // Average timeout loss
    const totalWinPnl = this.stats.wins * avgWinPnl;
    const totalLossPnl = this.stats.timeouts * avgLossPnl;
    const netPnl = totalWinPnl + totalLossPnl;
    
    console.log(`\n💰 Estimated P&L:`);
    console.log(`   Win P&L: +${totalWinPnl.toFixed(1)}%`);
    console.log(`   Loss P&L: ${totalLossPnl.toFixed(1)}%`);
    console.log(`   Net P&L: ${netPnl > 0 ? '+' : ''}${netPnl.toFixed(1)}%`);
    
    if (this.stats.executed > 0) {
      const avgPnl = netPnl / this.stats.executed;
      console.log(`   Avg P&L per trade: ${avgPnl > 0 ? '+' : ''}${avgPnl.toFixed(2)}%`);
    }
    
    console.log(`\n📝 Recent Trades:`);
    const recentTrades = this.trades.slice(-5);
    if (recentTrades.length === 0) {
      console.log(`   No trades recorded`);
    } else {
      recentTrades.forEach((trade, idx) => {
        const pnl = trade.exit.pnlPct;
        const reason = trade.exit.reason;
        const holdTime = (trade.exit.holdTimeMs / 1000).toFixed(1);
        console.log(`   ${idx + 1}. ${trade.mint.slice(0, 8)}... | ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}% | ${reason} | ${holdTime}s`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
  }

  async handleNewToken(token) {
    this.stats.detected++;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 NEW TOKEN DETECTED #${this.stats.detected}`);
    console.log(`   Mint: ${token.mint}`);
    console.log(`   Time: ${new Date().toISOString()}`);
    
    // Check if we can snipe (max concurrent limit)
    if (this.activePositions.size >= config.MAX_CONCURRENT_SNIPES) {
      console.log(`⏸️  Skipping - already have ${this.activePositions.size} active position(s)`);
      return;
    }
    
    // Execute snipe
    await this.snipe(token);
  }

  async snipe(token) {
    const snipeStart = Date.now();
    
    console.log(`\n💎 ${config.DRY_RUN ? 'SIMULATING' : 'SNIPING'} ${token.mint.slice(0, 8)}...`);
    
    // Reserve the position slot IMMEDIATELY to prevent race conditions
    const placeholderPosition = {
      mint: token.mint,
      entryTime: Date.now(),
      entryPrice: null,
      buySig: null,
      amountSol: config.POSITION_SIZE_SOL,
      tokenAmount: null
    };
    this.activePositions.set(token.mint, placeholderPosition);
    
    let buyResult;
    
    if (config.DRY_RUN) {
      // Dry-run mode: simulate buy with mock data
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200)); // Simulate network delay
      console.log(`   🧪 DRY-RUN: Simulated buy ${config.POSITION_SIZE_SOL} SOL`);
      console.log(`   ⏱️  Simulated execution: ${Date.now() - snipeStart}ms`);
      
      buyResult = {
        success: true,
        signature: 'SIM_' + Math.random().toString(36).substring(2, 15),
        mint: token.mint,
        amountSol: config.POSITION_SIZE_SOL,
        timestamp: Date.now(),
        executionTimeMs: Date.now() - snipeStart
      };
    } else {
      // Step 1: Buy (live mode only)
      buyResult = await this.executor.buyToken(token.mint);
    }
    
    if (!buyResult.success) {
      this.stats.failed++;
      console.log(`❌ Snipe failed - could not buy`);
      this.activePositions.delete(token.mint); // Remove placeholder
      this.recordTrade(token, buyResult, null, 'FAILED_BUY');
      return;
    }
    
    this.stats.executed++;
    
    // Update position with buy signature
    const position = this.activePositions.get(token.mint);
    position.buySig = buyResult.signature;
    
    console.log(`✅ Position opened`);
    console.log(`   Entry: ${new Date(position.entryTime).toLocaleTimeString()}`);
    
    // Wait for buy transaction to ACTUALLY confirm on-chain
    if (!buyResult.signature) {
      console.log(`   ❌ No transaction signature - cannot confirm`);
      this.activePositions.delete(token.mint);
      this.recordTrade(token, position, null, 'NO_SIGNATURE');
      return;
    }
    
    console.log(`   ⏳ Waiting for buy confirmation...`);
    const confirmed = await this.waitForConfirmation(buyResult.signature);
    
    if (!confirmed) {
      console.log(`   ⚠️  Buy confirmation timeout - exiting position`);
      this.activePositions.delete(token.mint);
      this.recordTrade(token, position, null, 'CONFIRMATION_TIMEOUT');
      return;
    }
    
    console.log(`   ✅ Buy confirmed on-chain!`);
    
    // Step 2: Monitor for exit
    await this.monitorPosition(token.mint, position);
  }

  async waitForConfirmation(signature, maxAttempts = 30) {
    // Poll for confirmation with 1-second intervals
    // 30 attempts = 30 seconds max wait
    console.log(`   🔍 Polling for confirmation: ${signature.slice(0, 8)}...`);
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const status = await this.executor.connection.getSignatureStatus(signature);
        
        if (status?.value?.confirmationStatus === 'confirmed' || 
            status?.value?.confirmationStatus === 'finalized') {
          console.log(`   ✅ Confirmed after ${i + 1} attempts (~${i + 1}s)`);
          return true;
        }
        
        if (status?.value?.err) {
          console.log(`   ❌ Transaction failed: ${JSON.stringify(status.value.err)}`);
          return false;
        }
        
      } catch (err) {
        console.log(`   ⚠️  Error checking status (attempt ${i + 1}): ${err.message}`);
      }
      
      // Wait 1 second before next check
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`   ❌ Confirmation timeout after ${maxAttempts}s`);
    return false;
  }

  async monitorPosition(mint, position) {
    console.log(`\n📊 Monitoring position...`);
    
    const startTime = Date.now();
    let priceChecks = 0;
    let entryPrice = null;
    
    const pollInterval = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      priceChecks++;
      
      // Get current price (or simulate in dry-run)
      let priceData;
      
      if (config.DRY_RUN) {
        // Simulate realistic price movement for dry-run
        if (!entryPrice) {
          entryPrice = 0.0001; // Starting price
        }
        
        // Simulate price: 30% chance of pumping, 70% chance of dumping/flat
        const rand = Math.random();
        let priceChange;
        
        if (rand < 0.3) {
          // Pumping (0% to +20%)
          priceChange = Math.random() * 0.20;
        } else {
          // Dumping or flat (-10% to +5%)
          priceChange = (Math.random() * 0.15) - 0.10;
        }
        
        const currentPrice = entryPrice * (1 + priceChange);
        priceData = { price: currentPrice, timestamp: Date.now() };
      } else {
        priceData = await this.executor.getTokenPrice(mint);
      }
      
      // ALWAYS check timeout first (even if price data fails!)
      if (elapsed >= config.MAX_HOLD_TIME_MS) {
        clearInterval(pollInterval);
        console.log(`\n⏱️  TIME LIMIT REACHED (${config.MAX_HOLD_TIME_MS/1000}s)`);
        await this.exitPosition(mint, position, 'TIME', 0);
        this.stats.timeouts++;
        return;
      }
      
      if (!priceData) {
        // No price data available - this is expected since we haven't implemented
        // bonding curve parsing yet. Just show elapsed time and wait for timeout.
        if (elapsed % 5000 < config.PRICE_POLL_MS) { // Log every 5 seconds
          console.log(`   [${(elapsed/1000).toFixed(1)}s] ⏳ Waiting for timeout (no price data yet)...`);
        }
        return; // Skip this iteration but keep monitoring
      }
      
      const currentPrice = priceData.price;
      
      // Set entry price on first successful check
      if (!entryPrice) {
        entryPrice = currentPrice;
        position.entryPrice = entryPrice;
        console.log(`   Entry price: $${entryPrice.toFixed(8)}`);
      }
      
      const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
      
      console.log(`   [${(elapsed/1000).toFixed(1)}s] Price: $${currentPrice.toFixed(8)} | P&L: ${pnlPct > 0 ? '+' : ''}${pnlPct.toFixed(2)}%`);
      
      // Exit condition: Take profit
      if (pnlPct >= config.TAKE_PROFIT_PCT) {
        clearInterval(pollInterval);
        console.log(`\n🎉 TAKE PROFIT HIT! +${pnlPct.toFixed(2)}%`);
        await this.exitPosition(mint, position, 'TP', pnlPct);
        this.stats.wins++;
        return;
      }
      
    }, config.PRICE_POLL_MS);
  }

  async exitPosition(mint, position, reason, pnlPct) {
    console.log(`\n💸 Exiting position...`);
    
    let tokenAmount, sellResult;
    
    if (config.DRY_RUN) {
      // Simulate sell in dry-run
      tokenAmount = 1000000; // Mock token amount
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200)); // Simulate network delay
      
      sellResult = {
        success: true,
        signature: 'SIM_' + Math.random().toString(36).substring(2, 15),
        mint: mint,
        timestamp: Date.now(),
        executionTimeMs: 150
      };
      
      console.log(`   🧪 DRY-RUN: Simulated sell`);
    } else {
      // Get token balance to sell
      tokenAmount = await this.executor.getTokenBalance(mint);
      
      if (tokenAmount <= 0) {
        console.log(`⚠️  No tokens to sell (balance: ${tokenAmount})`);
        this.activePositions.delete(mint);
        this.recordTrade({ mint }, position, null, 'NO_TOKENS');
        return;
      }
      
      // Execute sell
      sellResult = await this.executor.sellToken(mint, tokenAmount);
    }
    
    if (!sellResult.success) {
      console.log(`❌ Sell failed: ${sellResult.error}`);
      // Position still active - will retry or timeout
      this.recordTrade({ mint }, position, sellResult, 'FAILED_SELL');
      return;
    }
    
    // Calculate actual P&L
    const holdTime = Date.now() - position.entryTime;
    
    console.log(`\n✅ POSITION CLOSED`);
    console.log(`   Reason: ${reason}`);
    console.log(`   P&L: ${pnlPct > 0 ? '+' : ''}${pnlPct.toFixed(2)}%`);
    console.log(`   Hold time: ${(holdTime/1000).toFixed(1)}s`);
    console.log(`   Sell sig: ${sellResult.signature}`);
    
    // Remove from active
    this.activePositions.delete(mint);
    
    // Record trade
    this.recordTrade({ mint }, position, sellResult, reason, pnlPct, holdTime);
    
    console.log(`\n📊 Session Stats:`);
    console.log(`   Detected: ${this.stats.detected}`);
    console.log(`   Executed: ${this.stats.executed}`);
    console.log(`   Wins (TP): ${this.stats.wins}`);
    console.log(`   Timeouts: ${this.stats.timeouts}`);
    console.log(`   Failed: ${this.stats.failed}`);
    
    const winRate = this.stats.executed > 0 ? (this.stats.wins / this.stats.executed * 100) : 0;
    console.log(`   Win Rate: ${winRate.toFixed(1)}%\n`);
  }

  recordTrade(token, buyData, sellData, exitReason, pnlPct = 0, holdTimeMs = 0) {
    const trade = {
      mint: token.mint,
      timestamp: new Date().toISOString(),
      entry: {
        time: buyData?.entryTime || Date.now(),
        signature: buyData?.buySig || null,
        amountSol: buyData?.amountSol || 0
      },
      exit: {
        reason: exitReason,
        signature: sellData?.signature || null,
        pnlPct: pnlPct,
        holdTimeMs: holdTimeMs
      }
    };
    
    this.trades.push(trade);
    this.saveTrades();
  }

  saveState() {
    const state = {
      running: this.isRunning,
      stats: this.stats,
      activePositions: Array.from(this.activePositions.entries()),
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(config.STATE_FILE, JSON.stringify(state, null, 2));
  }

  saveTrades() {
    fs.writeFileSync(config.TRADES_FILE, JSON.stringify(this.trades, null, 2));
  }

  async stop() {
    console.log('\n🛑 Stopping sniper...');
    
    if (this.monitor) {
      await this.monitor.stop();
    }
    
    this.isRunning = false;
    this.saveState();
    
    console.log('✅ Sniper stopped');
  }
}

// Main execution
const sniper = new PumpSniper();

process.on('SIGINT', async () => {
  console.log('\n\nReceived SIGINT...');
  await sniper.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await sniper.stop();
  process.exit(0);
});

// Start
sniper.start().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

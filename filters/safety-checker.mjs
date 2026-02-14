/**
 * safety-checker.mjs - Pre-buy Safety Validation
 * Integrates multiple APIs to detect rugs, honeypots, and scams
 */

import { PublicKey } from '@solana/web3.js';
import fetch from 'node-fetch';

export class SafetyChecker {
  constructor(connection, config) {
    this.connection = connection;
    this.config = config;
    
    // API endpoints
    this.rugCheckAPI = 'https://api.rugcheck.xyz/v1/tokens';
    this.dexScreenerAPI = 'https://api.dexscreener.com/latest/dex/tokens';
    this.goPlusAPI = 'https://api.gopluslabs.io/api/v1/token_security/solana';
    
    // Cache to avoid duplicate API calls
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Rate limiting
    this.lastCall = {
      rugCheck: 0,
      dexScreener: 0,
      goPlus: 0
    };
    this.minInterval = {
      rugCheck: 200,    // 5 req/sec
      dexScreener: 200, // 5 req/sec (300/min limit)
      goPlus: 300       // 3 req/sec
    };
  }

  /**
   * Main safety check - runs all validations
   */
  async checkToken(mint) {
    const startTime = Date.now();
    
    console.log(`\n🔍 Safety Check: ${mint.slice(0, 8)}...`);
    
    // Check cache first
    const cached = this.getFromCache(mint);
    if (cached) {
      console.log(`   ⚡ Using cached result`);
      return cached;
    }

    const results = {
      mint: mint,
      passed: false,
      score: 0,
      checks: {},
      rejectionReason: null,
      timestamp: Date.now()
    };

    try {
      // 1. RugCheck (most comprehensive)
      console.log(`   1️⃣ RugCheck...`);
      const rugCheck = await this.checkRugCheck(mint);
      results.checks.rugCheck = rugCheck;
      
      if (!rugCheck.passed) {
        results.rejectionReason = `RugCheck: ${rugCheck.reason}`;
        this.saveToCache(mint, results);
        return results;
      }

      // 2. DexScreener (socials + liquidity)
      console.log(`   2️⃣ DexScreener...`);
      const dexScreener = await this.checkDexScreener(mint);
      results.checks.dexScreener = dexScreener;
      
      if (!dexScreener.passed) {
        results.rejectionReason = `DexScreener: ${dexScreener.reason}`;
        this.saveToCache(mint, results);
        return results;
      }

      // 3. GoPlus (honeypot + security)
      console.log(`   3️⃣ GoPlus...`);
      const goPlus = await this.checkGoPlus(mint);
      results.checks.goPlus = goPlus;
      
      if (!goPlus.passed) {
        results.rejectionReason = `GoPlus: ${goPlus.reason}`;
        this.saveToCache(mint, results);
        return results;
      }

      // 4. On-chain validation
      console.log(`   4️⃣ On-chain...`);
      const onChain = await this.checkOnChain(mint);
      results.checks.onChain = onChain;
      
      if (!onChain.passed) {
        results.rejectionReason = `On-chain: ${onChain.reason}`;
        this.saveToCache(mint, results);
        return results;
      }

      // Calculate composite score
      results.score = this.calculateScore(results.checks);
      results.passed = results.score >= this.config.MIN_SAFETY_SCORE;
      
      if (!results.passed) {
        results.rejectionReason = `Low score: ${results.score}`;
      }

      const elapsed = Date.now() - startTime;
      console.log(`   ${results.passed ? '✅' : '❌'} ${results.passed ? 'PASSED' : 'REJECTED'} (${elapsed}ms, score: ${results.score})`);
      
      this.saveToCache(mint, results);
      return results;

    } catch (err) {
      console.error(`   ❌ Safety check error: ${err.message}`);
      results.rejectionReason = `Error: ${err.message}`;
      return results;
    }
  }

  /**
   * RugCheck API validation
   */
  async checkRugCheck(mint) {
    try {
      await this.rateLimit('rugCheck');
      
      const response = await fetch(`${this.rugCheckAPI}/${mint}/report`, {
        timeout: 5000
      });

      if (!response.ok) {
        return { passed: false, reason: `API error ${response.status}` };
      }

      const data = await response.json();

      // Check for danger-level risks
      if (data.risks && Array.isArray(data.risks)) {
        const dangerRisks = data.risks.filter(r => r.level === 'danger');
        if (dangerRisks.length > 0) {
          return { 
            passed: false, 
            reason: `Danger: ${dangerRisks[0].name}`,
            risks: dangerRisks
          };
        }
      }

      // Check score threshold
      if (data.score < this.config.MIN_RUGCHECK_SCORE) {
        return { 
          passed: false, 
          reason: `Score too low: ${data.score}`,
          score: data.score
        };
      }

      // Check if already rugged
      if (data.rugged) {
        return { passed: false, reason: 'Already rugged' };
      }

      return { 
        passed: true, 
        score: data.score,
        risks: data.risks || []
      };

    } catch (err) {
      console.error(`   ⚠️ RugCheck error: ${err.message}`);
      // Don't reject on API failure - continue to other checks
      return { passed: true, error: err.message };
    }
  }

  /**
   * DexScreener API validation
   */
  async checkDexScreener(mint) {
    try {
      await this.rateLimit('dexScreener');
      
      const response = await fetch(`${this.dexScreenerAPI}/${mint}`, {
        timeout: 5000
      });

      if (!response.ok) {
        return { passed: false, reason: `API error ${response.status}` };
      }

      const data = await response.json();

      if (!data.pairs || data.pairs.length === 0) {
        return { passed: false, reason: 'No trading pairs found' };
      }

      const pair = data.pairs[0]; // Use first pair (usually Solana)

      // Check liquidity
      const liquidity = pair.liquidity?.usd || 0;
      if (liquidity < this.config.MIN_LIQUIDITY_USD) {
        return { 
          passed: false, 
          reason: `Low liquidity: $${liquidity.toFixed(0)}`,
          liquidity: liquidity
        };
      }

      // Check for socials (optional but recommended)
      const hasSocials = pair.info?.socials?.length > 0 || pair.info?.websites?.length > 0;
      
      if (this.config.REQUIRE_SOCIALS && !hasSocials) {
        return { passed: false, reason: 'No social presence' };
      }

      return { 
        passed: true,
        liquidity: liquidity,
        volume24h: pair.volume?.h24 || 0,
        hasSocials: hasSocials,
        priceChange24h: pair.priceChange?.h24 || 0
      };

    } catch (err) {
      console.error(`   ⚠️ DexScreener error: ${err.message}`);
      return { passed: true, error: err.message };
    }
  }

  /**
   * GoPlus Security API validation
   */
  async checkGoPlus(mint) {
    try {
      await this.rateLimit('goPlus');
      
      const response = await fetch(`${this.goPlusAPI}?contract_addresses=${mint}`, {
        timeout: 5000
      });

      if (!response.ok) {
        return { passed: false, reason: `API error ${response.status}` };
      }

      const data = await response.json();
      const result = data.result?.[mint];

      if (!result) {
        return { passed: false, reason: 'Token not found' };
      }

      // Check for critical issues
      if (result.is_honeypot === '1') {
        return { passed: false, reason: 'Honeypot detected' };
      }

      if (result.is_blacklisted === '1') {
        return { passed: false, reason: 'Blacklisted token' };
      }

      if (result.owner_change_balance === '1') {
        return { passed: false, reason: 'Owner can change balances' };
      }

      if (result.cannot_sell_all === '1') {
        return { passed: false, reason: 'Cannot sell all tokens' };
      }

      return { 
        passed: true,
        details: result
      };

    } catch (err) {
      console.error(`   ⚠️ GoPlus error: ${err.message}`);
      return { passed: true, error: err.message };
    }
  }

  /**
   * On-chain validation (direct RPC checks)
   */
  async checkOnChain(mint) {
    try {
      const mintPubkey = new PublicKey(mint);
      
      // Check if account exists
      const accountInfo = await this.connection.getAccountInfo(mintPubkey);
      if (!accountInfo) {
        return { passed: false, reason: 'Token account not found' };
      }

      // Verify token program (should be Token-2022 for pump.fun)
      const expectedProgram = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
      if (accountInfo.owner.toString() !== expectedProgram) {
        return { 
          passed: false, 
          reason: 'Non-standard token program',
          program: accountInfo.owner.toString()
        };
      }

      return { passed: true };

    } catch (err) {
      console.error(`   ⚠️ On-chain check error: ${err.message}`);
      return { passed: false, reason: err.message };
    }
  }

  /**
   * Calculate composite safety score
   */
  calculateScore(checks) {
    let score = 0;

    // RugCheck score (0-100)
    if (checks.rugCheck?.passed && checks.rugCheck.score) {
      score += checks.rugCheck.score * 0.4; // 40% weight
    }

    // DexScreener liquidity (normalized)
    if (checks.dexScreener?.passed && checks.dexScreener.liquidity) {
      const liquidityScore = Math.min(100, (checks.dexScreener.liquidity / 10000) * 100);
      score += liquidityScore * 0.3; // 30% weight
    }

    // GoPlus security (binary)
    if (checks.goPlus?.passed) {
      score += 20; // 20% weight
    }

    // On-chain validation (binary)
    if (checks.onChain?.passed) {
      score += 10; // 10% weight
    }

    return Math.round(score);
  }

  /**
   * Rate limiting helper
   */
  async rateLimit(api) {
    const now = Date.now();
    const elapsed = now - this.lastCall[api];
    const wait = Math.max(0, this.minInterval[api] - elapsed);
    
    if (wait > 0) {
      await new Promise(resolve => setTimeout(resolve, wait));
    }
    
    this.lastCall[api] = Date.now();
  }

  /**
   * Cache management
   */
  saveToCache(mint, result) {
    this.cache.set(mint, {
      result: result,
      timestamp: Date.now()
    });
  }

  getFromCache(mint) {
    const cached = this.cache.get(mint);
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTimeout) {
      this.cache.delete(mint);
      return null;
    }
    
    return cached.result;
  }

  /**
   * Clear expired cache entries
   */
  cleanCache() {
    const now = Date.now();
    for (const [mint, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.cacheTimeout) {
        this.cache.delete(mint);
      }
    }
  }
}

export default SafetyChecker;

# Pump Sniper - Project Status

## Current State: PAUSED FOR FILTER DEVELOPMENT

**Last Updated:** 2026-02-13 17:19 PST

## What Works ✅
- Token-2022 balance detection (fixed!)
- Real-time launch monitoring via WebSocket
- PumpPortal buy/sell integration
- One-at-a-time position management
- Auto-sell on timeout
- Fast execution (160-369ms buys)

## What Doesn't Work ❌
- **No filters** → Buying every token (99% are rugs)
- **No profits** → 0% win rate across all tests
- **High failure rate** → 16/18 buys rejected by PumpPortal
- **Strategy is unprofitable** → Lost ~$11 across tests

## Test Results Summary

### Test 1: 5-minute run (10s timeout)
- Detected: 333 launches
- Executed: 17 buys, 17 sells
- Wins: 0
- Cost: ~$45 (most of wallet balance)
- Issue: NO_TOKENS bug (fixed)

### Test 2: 2-minute run (10s timeout, fixed)
- Detected: 125 launches
- Executed: 9 buys, 8 sells
- Wins: 0
- Cost: ~$7
- Success: Fix working! All tokens sold properly

### Test 3: 5-minute run (3min timeout)
- Detected: 364 launches
- Executed: 2 buys, 1 sell
- Wins: 0
- Cost: ~$4
- Issue: Only 0.5% of tokens were buyable

## Key Learnings

1. **Token-2022 program** - Pump.fun uses new standard, must check both programs
2. **Most launches are rugs** - Need filters to avoid them
3. **Longer hold times don't help** - Tokens dump before hitting +10%
4. **PumpPortal rejects bad tokens** - Their API filters for us (but too late)
5. **Need pre-buy filtering** - Check liquidity, age, patterns BEFORE buying

## Next Steps (When Ready)

1. **Implement filters** (see FILTER_PLAN.md)
   - Age filter (10-30s delay)
   - Liquidity check (min 0.5 SOL in curve)
   - Metadata validation
   
2. **Alternative strategies to consider:**
   - Trade tokens 1-5min after launch (survivors)
   - Use DexScreener API (includes liquidity data)
   - Focus on established tokens (jupbot approach)

3. **Configuration tuning:**
   - Lower profit target? (3-5% instead of 10%)
   - Different hold times per token type?
   - Position sizing based on liquidity?

## Current Configuration
- Position: 0.01 SOL (testing)
- Take Profit: +10%
- Max Hold: 180s (3 minutes)
- Slippage: 10%
- Wallet: F6HhtGvP88vCfP5QeGLnA2wVTSjPcmCEsGXzYHPdTsrK
- Balance: ~0.09 SOL (~$19)

## Repository
**GitHub:** github.com/tekutron/pump-sniper
**Branch:** master
**Last Commit:** Increase hold time from 10s to 3 minutes

## Files
- `sniper.mjs` - Main bot
- `executor.mjs` - Buy/sell execution (Token-2022 fix)
- `pumpportal-sdk.mjs` - PumpPortal API integration
- `monitor.mjs` - WebSocket launch detector
- `config.mjs` - Configuration
- `FILTER_PLAN.md` - Strategy for adding filters
- `sell-all-tokens.mjs` - Emergency cleanup script

---

**Decision:** Paused development to plan filter strategy. Bot works technically but is unprofitable without filtering.

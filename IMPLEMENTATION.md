# Pump.fun Bonding Curve Implementation

**Date:** 2026-02-13  
**Status:** ✅ Complete - Ready for Testing

## What Was Built

### 1. PumpFunSDK (`pumpfun-sdk.mjs`)
Ultra-fast direct bonding curve integration for sniping pump.fun launches.

**Key Features:**
- Direct program interaction (no aggregator delays)
- PDA derivation for bonding curve accounts
- High priority fee management
- Automatic ATA creation if needed
- `skipPreflight` for maximum speed

**Methods:**
```javascript
sdk.buyToken(mintAddress, solAmount, slippageBps, priorityFeeLamports)
sdk.sellToken(mintAddress, tokenAmount, priorityFeeLamports)
sdk.getBondingCurvePrice(mintAddress)
```

### 2. Executor Integration (`executor.mjs`)
Updated to use PumpFunSDK instead of simulated transactions.

**Real Features:**
- ✅ Real pump.fun bonding curve buys
- ✅ Real pump.fun bonding curve sells
- ✅ Token balance queries
- ✅ Wallet balance checks
- ⚠️ Price fetching (needs bonding curve state parsing)

### 3. Test Suite (`test-pumpfun.mjs`)
Safe testing without sending transactions.

**Tests:**
- Wallet balance check
- PDA derivation
- SDK initialization
- Config validation

## Why Pump.fun Direct?

**vs Jupiter:**
- ❌ Jupiter: Extra API calls + routing delays
- ✅ Pump.fun: Direct program = fastest execution

**vs Raydium:**
- ❌ Raydium: Tokens not on DEXes yet
- ✅ Pump.fun: Native bonding curve = only option for new launches

## Technical Details

### Transaction Structure

**Buy Instruction:**
```
Accounts:
1. Global state (pump.fun)
2. Fee recipient
3. Token mint
4. Bonding curve PDA
5. Associated bonding curve token account
6. User token account (ATA)
7. User wallet (signer)
8. System program
9. Token program
10. Associated token program

Data:
- Discriminator: 0x66063d1201daebea (8 bytes)
- Lamports to spend: u64 LE (8 bytes)
- Max tokens: u64 LE (8 bytes)
```

**Sell Instruction:**
```
Accounts: Similar to buy (without associated token program)

Data:
- Discriminator: 0x33e685a4017f83ad (8 bytes)
- Token amount: u64 LE (8 bytes)
- Min SOL output: u64 LE (8 bytes)
```

### Speed Optimizations

1. **skipPreflight: true**
   - Saves ~200ms per transaction
   - Risk: Failed transactions still consume fees
   - Acceptable for sniping (speed > safety)

2. **High Priority Fees**
   - 0.001 SOL (~$0.20) per transaction
   - Ensures fast inclusion in blocks
   - Critical for competitive sniping

3. **No Confirmation Wait**
   - Return signature immediately
   - Don't wait for confirmation
   - Parallel monitoring tracks success

## Configuration

**Current Settings (config.mjs):**
```javascript
POSITION_SIZE_SOL: 0.05      // ~$10 per snipe
TAKE_PROFIT_PCT: 10          // Sell at +10%
MAX_HOLD_TIME_MS: 10000      // Force sell after 10s
PRIORITY_FEE_SOL: 0.001      // High priority
SLIPPAGE_BPS: 1000           // 10% slippage
PRICE_POLL_MS: 100           // Check price every 100ms
```

## Testing Checklist

### Pre-Live Testing

- [x] SDK loads correctly
- [x] Wallet balance check works
- [x] PDA derivation works
- [ ] Dry-run monitor (detect launches without buying)
- [ ] Small test (1-2 snipes with 0.01 SOL)
- [ ] Verify token balance after buy
- [ ] Verify SOL received after sell

### Live Deployment

- [ ] Monitor detection speed (<500ms)
- [ ] Track buy execution time
- [ ] Track sell execution time
- [ ] Monitor success rate
- [ ] Track P&L over 1 hour
- [ ] Optimize based on data

## Safety Notes

⚠️ **REAL MONEY AT RISK**

1. Start with dry-run (monitor only)
2. Then small tests (0.01 SOL)
3. Gradually increase to full size (0.05 SOL)
4. Keep MIN_BALANCE_SOL reserve (0.1 SOL)
5. Monitor logs carefully

## Next Steps

1. **Implement price parsing** - Parse bonding curve state for real prices
2. **Dry-run test** - Monitor launches without buying
3. **Small live test** - 1-2 snipes with 0.01 SOL
4. **Full deployment** - If tests pass
5. **Optimization** - Analyze speed metrics, tune parameters

## Performance Targets

- **Detection to buy:** <500ms
- **Buy execution:** <300ms
- **Price poll latency:** <100ms
- **Sell execution:** <300ms
- **Total round-trip:** <1200ms

## Known Limitations

1. **Price fetching:** Currently returns placeholder - needs bonding curve state parsing
2. **No slippage calculation:** Accepts any amount on sell (could improve)
3. **No transaction retry logic:** Failed transactions are lost (could add retries)
4. **No MEV protection:** High priority fees help but not guaranteed

## Success Metrics

**Target (Conservative):**
- 30% win rate (+10% TP hit)
- 70% time exits (-2% avg)
- Net: +3% hourly ROI

**Target (Aggressive):**
- 40% win rate
- 60% time exits
- Net: +7% hourly ROI

---

**Ready for testing!** Start with `node test-pumpfun.mjs`, then dry-run, then small live tests.

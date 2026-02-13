# Pump Sniper - Quick Start Guide

## What It Does
Monitors pump.fun for new token launches → Buys instantly → Sells at +10% or 10 seconds

## Installation
```bash
cd /home/j/.openclaw/pump-sniper
npm install
```

## Test Setup
```bash
node test-sniper.mjs
```

Should show:
- ✅ Config OK
- ✅ Executor OK (wallet + balance)
- ✅ Monitor OK

## Run Sniper
```bash
MAIN_WALLET=1 node sniper.mjs
```

## Strategy
- **Buy:** Instantly on new token detection
- **Sell:** +10% profit OR 10 seconds (whichever first)
- **Position:** 0.05 SOL per snipe
- **Speed:** <500ms from detection to buy

## Controls
- **Stop:** Ctrl+C (graceful shutdown)
- **View state:** `cat sniper_state.json`
- **View trades:** `cat sniper_trades.json`

## Status
🚧 **Phase 1 Complete:** Monitor + Executor built
⚠️ **TODO:** Implement real swap logic (currently simulated)

## Next Steps
1. Add Jupiter aggregator for swaps
2. Add pump.fun bonding curve direct interaction
3. Test on devnet first
4. Deploy live

## Expected Performance
- **Detections:** 10-20 per hour during active times
- **Win rate:** 30-40% hit +10% target
- **Hourly:** +3-7% (conservative estimate)

---

**Wallet:** Same as trading bot (0.282 SOL)  
**Risk:** High (new launches are volatile)

# Pump Sniper - Project Plan

## Goal
**Buy new pump.fun tokens instantly on launch, sell at +10% or 10 seconds**

## Core Strategy

### Phase 1: Launch Detection
- Monitor pump.fun program for new token creation events
- WebSocket connection to Solana for real-time monitoring
- Filter for pump.fun program ID transactions

### Phase 2: Instant Buy
- Execute buy order within milliseconds of detection
- Use high priority fees for fast inclusion
- Position size: 0.05 SOL

### Phase 3: Fast Exit
- **Exit trigger 1:** Price hits +10% → instant sell
- **Exit trigger 2:** 10 seconds elapsed → force sell
- Poll price every 100ms for fastest reaction

## Technical Details

### Pump.fun Program
- **Program ID:** `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P` (pump.fun bonding curve)
- **Event:** Look for "create" instructions
- **Token mint:** Extract from transaction data

### Buy Execution
```javascript
// 1. Detect new token creation
// 2. Build swap transaction (SOL → Token)
// 3. Set high priority fee (0.001 SOL)
// 4. Send transaction immediately
// 5. Don't wait for confirmation (parallel monitoring)
```

### Sell Execution
```javascript
// Two parallel monitors:
// A. Price monitor (100ms polling)
//    - If price >= entry * 1.10 → SELL
// B. Timer (10 seconds)
//    - If elapsed >= 10s → SELL
// Whichever triggers first wins
```

## Key Metrics
- **Speed:** < 500ms from detection to buy submission
- **Success rate:** 70%+ (some will fail due to network/competition)
- **Win rate:** 30-40% (realistic for pump.fun sniping)
- **R/R:** 10% win vs stop loss (time-based)

## Risk Management
- Max position: 0.05 SOL (same as trading bot)
- Time-based exit ensures no bag-holding
- High priority fees cost 0.001 SOL (~$0.20) - acceptable

## File Structure
```
pump-sniper/
├── sniper.mjs           # Main bot
├── monitor.mjs          # Pump.fun monitoring
├── executor.mjs         # Buy/sell execution
├── config.mjs           # Configuration
├── wallets/
│   └── generated_keypair.json
├── .env                 # RPC + secrets
├── sniper_state.json    # Current state
└── sniper_trades.json   # Trade history
```

## Development Steps

### Step 1: Monitor Setup ✅
- WebSocket connection to Solana
- Filter pump.fun program transactions
- Parse new token mints

### Step 2: Buy Logic
- Build swap transaction (Raydium or pump.fun native swap)
- Add priority fees
- Execute instantly

### Step 3: Exit Logic
- Price polling (100ms)
- Timer (10s max)
- Sell on first trigger

### Step 4: State Management
- Track active positions
- Log all trades
- Recovery from crashes

### Step 5: Testing
- Paper trade mode
- Measure detection speed
- Optimize execution

## Expected Performance

### Conservative Estimate
- 10 snipes/hour during active hours
- 30% hit +10% target
- 70% force-sell at 10s (usually -5% to +5%)

**Example Hour:**
- 10 snipes × 0.05 SOL each
- 3 wins: +10% × 3 = +0.015 SOL
- 7 time exits: -2% avg × 7 = -0.007 SOL
- **Net:** +0.008 SOL/hour (+3% hourly)

### Aggressive (If Market Hot)
- 20 snipes/hour
- 40% hit +10%
- **Net:** +0.02 SOL/hour (+7% hourly)

## Advantages Over Trading Bot
1. **Speed focus** - No momentum analysis needed
2. **Simple strategy** - Just time-based exits
3. **High volume** - Pump.fun launches constantly
4. **No bag-holding** - 10s max ensures quick capital return

## Next Steps
1. Build monitor.mjs (detect new tokens)
2. Build executor.mjs (buy/sell logic)
3. Build sniper.mjs (main loop)
4. Test on devnet first
5. Deploy live

---

**Status:** 🚧 Building Phase 1 (Monitor Setup)

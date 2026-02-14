# Safe Pump Sniper - Implementation Roadmap

## Architecture Overview

```
[Event Listener] 
    ↓
[Pre-Filter Engine] ← START HERE (Phase 1)
    ↓
[Dev & Wallet Risk Analyzer] ← Phase 2
    ↓
[Momentum Validator] ← START HERE (Phase 1)
    ↓
[Entry Executor] ← IMPROVE (Phase 1)
    ↓
[Live Position Monitor] ← START HERE (Phase 1)
    ↓
[Exit Engine] ← START HERE (Phase 1)
    ↓
[Risk Management Layer] ← Phase 2
```

## Phase 1: Core Safety (Week 1)
**Goal:** Eliminate 80% of rugs with basic filters

### 1.1 Age Filter ✅ Quick Win
**File:** `filters/age-filter.mjs`
```javascript
- Wait 10-15 seconds after launch
- Track launch timestamp
- Skip immediate entries
```
**Impact:** Avoids instant rugs, gives time for initial patterns

### 1.2 Momentum Validator ✅ Essential
**File:** `filters/momentum-validator.mjs`

**Metrics to track (10-15s window):**
```javascript
{
  uniqueBuyers: count,      // min: 8-10
  totalVolume: SOL,         // min: 10-15 SOL
  buySellRatio: number,     // min: 2:1
  avgBuySize: SOL,          // detect whales
  bondingProgress: percent   // min: 5%
}
```

**Score calculation:**
```javascript
score = (uniqueBuyers * 10) +
        (totalVolume * 5) +
        (buySellRatio * 20) -
        (sellPressure * 30)

// Enter if score > 100
```

### 1.3 Basic Exit Engine ✅ Critical
**File:** `exit-engine.mjs`

**Immediate exits:**
- Dev wallet sells ANY amount
- Single wallet dumps >5% supply
- Buy velocity drops 60%
- Price drops >15% from entry

**Profit taking:**
- 50% at +30%
- Remaining at +60% OR momentum decay
- Hard stop: -20%

### 1.4 Live Position Monitor ✅ Required
**File:** `position-monitor.mjs`

**Check every 500ms:**
```javascript
{
  priceChange: percent,
  recentBuyers: count,
  recentSellers: count,
  topHolderChanges: boolean,
  devWalletActivity: boolean
}
```

**Implementation:**
- Fetch recent transactions from bonding curve
- Parse buy/sell events
- Track wallet addresses
- Detect large movements

---

## Phase 2: Risk Intelligence (Week 2)

### 2.1 Dev Wallet Reputation DB
**File:** `database/dev-reputation.mjs`

**Track:**
```javascript
{
  devWallet: string,
  tokensCreated: number,
  avgPeakMultiplier: number,
  rugCount: number,
  avgLifespan: seconds,
  lastDeployTime: timestamp,
  riskScore: 0-100
}
```

**Build history by:**
- Scanning historical pump.fun creates
- Tracking token lifecycle
- Calculating success metrics

### 2.2 Wallet Clustering Detection
**File:** `filters/wallet-analyzer.mjs`

**Check first 10-20 buyers:**
```javascript
{
  fundingSources: Set,
  largestHolder: percent,
  walletAges: array,
  fundingPatterns: analyzed
}
```

**Red flags:**
- 2 wallets control >40%
- Same funder for 5+ buyers
- Instant >20% allocation
- All wallets <1 day old

### 2.3 Global Risk Management
**File:** `risk-manager.mjs`

**Daily limits:**
- Max 3 open positions
- Max 2-3% risk per trade
- Stop after 3 consecutive losses
- Stop after 5% daily drawdown

**Position sizing:**
```javascript
if (riskScore < 30) {
  size = 0.5 SOL  // Low risk
} else if (riskScore < 60) {
  size = 0.25 SOL // Medium
} else {
  skip  // High risk
}
```

---

## Phase 3: Advanced (Week 3+)

### 3.1 Machine Learning Risk Model
- Historical pattern analysis
- Success prediction
- Dynamic threshold adjustment

### 3.2 Low-Latency Infrastructure
- Direct RPC node
- Mempool monitoring
- Transaction priority optimization

### 3.3 Advanced Exit Strategies
- Trailing stops
- Volume-weighted exits
- Momentum-based scaling

---

## Implementation Order

**Week 1 Sprint:**
```
Day 1: Age filter + momentum validator
Day 2: Exit engine with instant triggers
Day 3: Position monitor (live tracking)
Day 4: Integration + testing
Day 5: Dry-run validation
```

**Expected Results After Phase 1:**
- Trades: 364 → ~20-30 (filtered)
- Success rate: 0% → 15-25%
- Failed buys: 16 → 1-2
- Win rate: 0% → 20-40%

---

## Data Requirements

**Need from pump.fun / blockchain:**
1. Transaction history (recent buys/sells)
2. Bonding curve state (progress, SOL balance)
3. Token holder list (top 10-20)
4. Dev wallet address
5. Token creation timestamp

**APIs to use:**
- PumpPortal API (limited data)
- Direct RPC queries (most reliable)
- Helius webhooks (optional)
- DexScreener (for established tokens)

---

## Testing Strategy

**Dry-run mode improvements:**
```javascript
DRY_RUN_WITH_FILTERS = true
LOG_FILTER_DECISIONS = true
SIMULATE_EXITS = true
```

**Metrics to track:**
- Filter rejection reasons
- Entry score distribution
- Exit trigger frequencies
- Simulated P&L

---

## Success Metrics

**Phase 1 Target:**
- 80% rug avoidance
- 20-30% win rate
- 2:1 win/loss ratio
- Max drawdown <15%

**Phase 2 Target:**
- 90% rug avoidance
- 30-40% win rate
- 3:1 win/loss ratio
- Max drawdown <10%

---

## Next Steps

**Immediate (Today):**
1. Agree on Phase 1 scope
2. Start with age filter + basic momentum
3. Design data collection strategy

**This Week:**
- Build Phase 1 components
- Test with dry-run
- Tune thresholds

**Next Week:**
- Deploy Phase 1 live (small size)
- Collect data for Phase 2
- Build dev reputation DB

---

**Question for you:**
Which Phase 1 components do you want to start with?
1. Age + Momentum filters (entry side)
2. Exit engine (safety side)
3. Position monitor (tracking)

I recommend starting with #2 (Exit Engine) - that's where safe bots outperform.

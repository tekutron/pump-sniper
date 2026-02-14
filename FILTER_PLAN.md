# Filter Strategy Plan

## Current Problem
- 364 tokens detected in 5 minutes
- Only 2 were buyable (0.5% success rate)
- 16 failed buys (PumpPortal rejecting bad tokens)
- 0 profitable trades
- Most tokens are rugs/instant dumps

## Why Filters Are Needed
Without filters, we're trying to snipe EVERY new token, including:
- Honeypots (can't sell)
- Rugs (dev dumps immediately)
- Low liquidity (can't exit)
- Scams (freeze/blacklist functions)

## Proposed Filters (Pre-Buy Checks)

### 1. Liquidity Requirement
**Goal:** Only buy tokens with actual trading volume
- Check bonding curve SOL balance (minimum threshold)
- Use PumpPortal API or on-chain data
- **Minimum:** 0.5-1 SOL in curve (indicates real interest)

### 2. Age Filter
**Goal:** Skip brand new tokens (first few seconds are most dangerous)
- Wait 10-30 seconds after launch before buying
- Gives time for initial rug/dump to happen
- **Trade-off:** Miss the absolute first pump, but avoid most scams

### 3. Transaction Pattern Analysis
**Goal:** Detect suspicious activity
- Check recent transactions on bonding curve
- Skip if:
  - Single large buy followed by sell (pump & dump setup)
  - Multiple buys from same wallet (bot/coordinated attack)
  - Unusual patterns

### 4. Token Metadata Check
**Goal:** Filter out obvious scams
- Check token name/symbol for red flags
- Skip tokens with:
  - No metadata
  - Suspicious names (TEST, RUG, SCAM, etc.)
  - Unicode/invisible characters

### 5. Price Movement Analysis
**Goal:** Only buy tokens showing momentum
- Wait for initial price action
- Only buy if:
  - Price is up since launch
  - Volume is increasing
  - Buys > sells ratio

## Implementation Priority

### Phase 1 (Quick Wins)
1. **Age filter** - Easy to implement, high impact
2. **Liquidity check** - Prevents buying dead tokens

### Phase 2 (More Complex)
3. **Metadata check** - Requires token info API
4. **Transaction analysis** - Requires parsing recent txs

### Phase 3 (Advanced)
5. **Price momentum** - Requires price tracking over time

## Expected Impact
- Reduce detection from 364 → ~50 tokens (with filters)
- Increase buy success from 0.5% → 10-20%
- Reduce failures from 16/2 → 1-2/10
- Increase profitable trades from 0% → 10-30%

## Next Steps
1. Choose which filters to implement first
2. Research PumpPortal API capabilities
3. Build filter pipeline
4. Test with dry-run mode
5. Tune filter thresholds based on results

## Alternative Approach
Instead of sniping fresh launches, consider:
- Trading tokens 1-5 minutes after launch (survivors)
- Using DexScreener new pairs API (includes liquidity/volume data)
- Focus on tokens that already showed momentum

---
**Status:** Plan created, ready to implement when ready to resume development

# Wallet Setup

## Dedicated Wallets (Recommended)

**Pump Sniper:** Uses its own dedicated wallet  
**Trading Bot (jupbot):** Uses separate wallet

### Why Separate Wallets?

1. **Risk Isolation** - If one bot fails, doesn't drain the other
2. **Clean Accounting** - Track P&L per strategy independently
3. **Safety** - Limits exposure per bot

## Pump Sniper Wallet

**Address:** `F6HhtGvP88vCfP5QeGLnA2wVTSjPcmCEsGXzYHPdTsrK`  
**Path:** `./wallets/pump_sniper_wallet.json`  
**Used by:** pump-sniper bot only

### Funding

Before running the sniper, fund this wallet with SOL:

```bash
# Recommended starting balance: 0.5 - 1.0 SOL
# Breakdown:
# - 0.05 SOL x 10 positions = 0.5 SOL trading capital
# - 0.1 SOL reserve for fees
# - Total: 0.6+ SOL recommended
```

### Check Balance

```bash
cd /home/j/.openclaw/pump-sniper
node test-pumpfun.mjs
```

## Trading Bot Wallet (jupbot)

**Address:** `8T4jWyFfxjN1YjkesR2JVK955Za38p6S6i4MqKR6LXGA`  
**Path:** `/home/j/.openclaw/workspace/jupbot/wallets/generated_keypair.json`  
**Used by:** momentum trading bot only

---

**Security:** Never share private keys! Wallets are stored locally only.

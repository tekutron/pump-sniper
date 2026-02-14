# Safety APIs for Pump Sniper

## Pre-Buy Safety Check Stack

### 1. RugCheck.xyz API ⭐ Most Important
**Purpose:** Comprehensive Solana token security analysis

**Endpoint:** `https://api.rugcheck.xyz/v1/tokens/{mint}/report`

**What it checks:**
- Mint/freeze authority (can dev rug?)
- Top holder concentration
- Liquidity lock status
- Token metadata
- Contract risks
- Market risks

**Response Example:**
```json
{
  "mint": "...",
  "risks": [
    {
      "name": "Top 10 Holders",
      "level": "danger",
      "description": "Top 10 holders own 95% of supply"
    }
  ],
  "score": 45,
  "tokenMeta": {...}
}
```

**Integration:**
```javascript
async function checkRugRisk(mint) {
  const response = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`);
  const data = await response.json();
  
  // Red flags
  if (data.score < 50) return { safe: false, reason: "Low RugCheck score" };
  if (data.risks.some(r => r.level === 'danger')) return { safe: false, reason: "Danger risk detected" };
  
  return { safe: true, score: data.score };
}
```

**Rate Limits:** Unknown - need to test
**Cost:** Free (community API)

---

### 2. Honeypot Detection
**Problem:** Some tokens let you buy but can't sell (honeypot)

**Method 1: Simulate Transaction**
```javascript
async function isHoneypot(mint) {
  // Build a test sell transaction
  // Use simulateTransaction() to test if it would fail
  // Don't actually send it
  
  const testTx = await buildSellTransaction(mint, smallAmount);
  const simulation = await connection.simulateTransaction(testTx);
  
  if (simulation.value.err) {
    return { honeypot: true, reason: simulation.value.err };
  }
  
  return { honeypot: false };
}
```

**Method 2: Check Token Program**
```javascript
// pump.fun tokens should use Token-2022
// Suspicious if using custom program
const accountInfo = await connection.getAccountInfo(new PublicKey(mint));
if (accountInfo.owner.toString() !== 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb') {
  return { suspicious: true, reason: "Non-standard token program" };
}
```

---

### 3. Social Verification
**Purpose:** Verify token has real social presence (not anonymous rug)

**Data Sources:**

#### A. Token Metadata (On-chain)
```javascript
const metadata = await connection.getAccountInfo(metadataPDA);
// Check for:
// - Twitter handle
// - Website
// - Telegram
// - Discord
```

#### B. Birdeye API
**Endpoint:** `https://public-api.birdeye.so/public/token_overview`

**Checks:**
- Verified socials
- Holder count
- Trading volume
- Age

```javascript
async function checkSocials(mint) {
  const response = await fetch(
    `https://public-api.birdeye.so/public/token_overview?address=${mint}`,
    { headers: { 'X-API-KEY': process.env.BIRDEYE_API_KEY } }
  );
  
  const data = await response.json();
  
  return {
    hasTwitter: !!data.data.twitter,
    hasWebsite: !!data.data.website,
    hasTelegram: !!data.data.telegram,
    verified: data.data.verified || false
  };
}
```

**Cost:** Free tier: 100 req/day

#### C. DexScreener API (Free!)
**Endpoint:** `https://api.dexscreener.com/latest/dex/tokens/{mint}`

**Provides:**
- Social links
- Website
- Market data
- Liquidity

```javascript
async function getDexScreenerInfo(mint) {
  const response = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${mint}`
  );
  
  const data = await response.json();
  if (!data.pairs || data.pairs.length === 0) {
    return { found: false };
  }
  
  const pair = data.pairs[0];
  return {
    hasWebsite: !!pair.info?.websites?.length,
    hasSocials: !!pair.info?.socials?.length,
    liquidity: pair.liquidity?.usd || 0,
    volume24h: pair.volume?.h24 || 0
  };
}
```

**Rate Limits:** 300 req/min (very generous)

---

### 4. GoPlus Security API ⭐ Alternative to RugCheck
**Purpose:** Multi-chain security scanner

**Endpoint:** `https://api.gopluslabs.io/api/v1/token_security/solana`

**What it checks:**
- Contract security
- Holder risks
- Trading security
- Ownership

```javascript
async function checkGoPlus(mint) {
  const response = await fetch(
    `https://api.gopluslabs.io/api/v1/token_security/solana?contract_addresses=${mint}`
  );
  
  const data = await response.json();
  const result = data.result[mint];
  
  // Red flags
  if (result.is_honeypot === '1') return { safe: false, reason: "Honeypot detected" };
  if (result.is_blacklisted === '1') return { safe: false, reason: "Blacklisted" };
  if (result.owner_change_balance === '1') return { safe: false, reason: "Owner can change balance" };
  
  return { safe: true, details: result };
}
```

**Cost:** Free for reasonable usage

---

### 5. Helius Token Metadata API
**Purpose:** Get rich token metadata

**Endpoint:** `https://api.helius.xyz/v0/token-metadata`

```javascript
async function getHeliusMetadata(mint) {
  const response = await fetch(
    `https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY}`,
    {
      method: 'POST',
      body: JSON.stringify({ mintAccounts: [mint] })
    }
  );
  
  const data = await response.json();
  return data[0];
}
```

---

## Recommended Filter Pipeline

```javascript
async function safetyCheckPipeline(mint) {
  console.log(`🔍 Running safety checks for ${mint.slice(0,8)}...`);
  
  // 1. RugCheck (most comprehensive)
  const rugCheck = await checkRugRisk(mint);
  if (!rugCheck.safe) {
    return { passed: false, reason: `RugCheck: ${rugCheck.reason}` };
  }
  
  // 2. Honeypot simulation
  const honeypotCheck = await isHoneypot(mint);
  if (honeypotCheck.honeypot) {
    return { passed: false, reason: "Honeypot detected" };
  }
  
  // 3. Social verification (optional but recommended)
  const socials = await checkSocials(mint);
  if (!socials.hasTwitter && !socials.hasWebsite) {
    return { passed: false, reason: "No social presence" };
  }
  
  // 4. DexScreener check (liquidity/volume)
  const dexInfo = await getDexScreenerInfo(mint);
  if (dexInfo.liquidity < 1000) {
    return { passed: false, reason: "Insufficient liquidity" };
  }
  
  return { 
    passed: true, 
    score: rugCheck.score,
    socials: socials,
    liquidity: dexInfo.liquidity
  };
}
```

---

## Implementation Strategy

**Phase 1: Essential Safety**
1. RugCheck API (primary filter)
2. Honeypot simulation
3. Basic metadata check

**Phase 2: Enhanced Verification**
4. GoPlus API (backup to RugCheck)
5. DexScreener liquidity/volume
6. Social verification

**Phase 3: Advanced**
7. Historical dev tracking
8. Wallet clustering analysis
9. Custom honeypot detection

---

## Rate Limit Management

```javascript
class SafetyAPIManager {
  constructor() {
    this.rugCheckCache = new Map(); // Cache results for 5 minutes
    this.lastCall = { rugCheck: 0, goPlus: 0, dexScreener: 0 };
    this.minInterval = { rugCheck: 100, goPlus: 100, dexScreener: 200 };
  }
  
  async callWithRateLimit(api, fn) {
    const now = Date.now();
    const elapsed = now - this.lastCall[api];
    const wait = Math.max(0, this.minInterval[api] - elapsed);
    
    if (wait > 0) {
      await new Promise(resolve => setTimeout(resolve, wait));
    }
    
    this.lastCall[api] = Date.now();
    return await fn();
  }
}
```

---

## Cost Estimate

**Free Tier (Recommended Start):**
- RugCheck: Free
- DexScreener: Free (300 req/min)
- GoPlus: Free (reasonable usage)
- Helius: Free tier (100k credits/month)

**Total:** $0/month for testing

**Paid Tier (If Scaling):**
- Helius Pro: $50-200/month
- Birdeye Pro: $99/month
- Custom RPC: $50-500/month

---

## Testing Tokens

**Known Safe Token (for testing):**
- SOL: `So11111111111111111111111111111111111111112`
- USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

**Known Rug (for testing filters):**
- Use with caution, check rugcheck.xyz for recent rugs

---

## Next Steps

1. **Test RugCheck API** - Verify it works with pump.fun tokens
2. **Build safety check module** - `filters/safety-checker.mjs`
3. **Add to entry pipeline** - Filter before buying
4. **Log rejection reasons** - Learn what filters catch

Would you like me to start building the safety checker module?

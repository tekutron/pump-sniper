#!/usr/bin/env node
/**
 * test-moralis-price.mjs - Test Moralis price API
 */

import fetch from 'node-fetch';
import config from './config.mjs';

const MORALIS_API_KEY = config.MORALIS_API_KEY;

async function testMoralisPrice(tokenMint) {
  console.log(`\n🧪 Testing Moralis price API for ${tokenMint.slice(0, 8)}...`);
  console.log(`   API Key: ${MORALIS_API_KEY.slice(0, 20)}...`);
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(
      `https://solana-gateway.moralis.io/token/mainnet/${tokenMint}/price`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-Key': MORALIS_API_KEY
        }
      }
    );
    
    const responseTime = Date.now() - startTime;
    console.log(`   Response time: ${responseTime}ms`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   ❌ Error response: ${errorText}`);
      return;
    }
    
    const data = await response.json();
    console.log(`   ✅ Response data:`, JSON.stringify(data, null, 2));
    
    if (data.usdPrice) {
      console.log(`\n💰 Price: $${data.usdPrice}`);
      console.log(`   Liquidity: $${data.liquidity || 'N/A'}`);
    } else {
      console.log(`   ⚠️  No price data available`);
    }
    
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }
}

// Test with a known token (USDC for baseline)
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Test with a recent pump.fun token (from last test)
const PUMP_TOKEN = '6kApdP8EdUL8oC2SenA6AbKEUDGzaCFJqajCVn6vpump';

console.log('='.repeat(60));
console.log('🧪 Moralis Price API Test');
console.log('='.repeat(60));

// Test USDC (should always work)
await testMoralisPrice(USDC);

// Test pump.fun token
await testMoralisPrice(PUMP_TOKEN);

console.log('\n' + '='.repeat(60));
console.log('✅ Test complete');
console.log('='.repeat(60));

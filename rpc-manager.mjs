#!/usr/bin/env node
/**
 * rpc-manager.mjs - RPC Rotation Manager
 * Spreads load across multiple free Solana RPC endpoints
 */

import { Connection } from '@solana/web3.js';

export class RPCManager {
  constructor() {
    // Free Solana RPC endpoints (round-robin)
    this.endpoints = [
      process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=86172fb4-a950-47b4-9641-ac1a0a346492',
      'https://api.mainnet-beta.solana.com',
      'https://rpc.ankr.com/solana',
      'https://solana-api.projectserum.com',
    ].filter(Boolean); // Remove any null/undefined
    
    this.currentIndex = 0;
    this.connections = new Map();
    
    // Pre-create connections
    this.endpoints.forEach((endpoint, idx) => {
      this.connections.set(idx, new Connection(endpoint, 'confirmed'));
    });
    
    console.log(`📡 RPC Manager initialized with ${this.endpoints.length} endpoints`);
  }

  /**
   * Get next RPC connection (round-robin)
   */
  getConnection() {
    const connection = this.connections.get(this.currentIndex);
    const endpoint = this.endpoints[this.currentIndex];
    
    // Rotate to next endpoint
    this.currentIndex = (this.currentIndex + 1) % this.endpoints.length;
    
    return { connection, endpoint };
  }

  /**
   * Get a specific connection by index (for sticky operations)
   */
  getConnectionByIndex(index) {
    const idx = index % this.endpoints.length;
    return {
      connection: this.connections.get(idx),
      endpoint: this.endpoints[idx]
    };
  }

  /**
   * Execute an RPC call with retry across endpoints
   */
  async executeWithRetry(fn, maxRetries = 3) {
    let lastError = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { connection } = this.getConnection();
        return await fn(connection);
      } catch (err) {
        lastError = err;
        
        // If rate limited, try next endpoint immediately
        if (err.message.includes('429') || err.message.includes('rate limit')) {
          console.log(`   ⚠️  RPC rate limited, rotating to next endpoint...`);
          continue;
        }
        
        // For other errors, throw immediately
        throw err;
      }
    }
    
    // All retries failed
    throw lastError;
  }

  /**
   * Get primary connection (for transactions that need consistency)
   */
  getPrimaryConnection() {
    return this.connections.get(0);
  }
}

export default RPCManager;

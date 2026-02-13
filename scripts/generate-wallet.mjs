#!/usr/bin/env node
import { Keypair } from '@solana/web3.js';
import fs from 'node:fs';
import path from 'node:path';

const walletPath = path.join(process.cwd(), 'wallets', 'pump_sniper_wallet.json');

// Generate new keypair
const keypair = Keypair.generate();

// Save to file
fs.writeFileSync(walletPath, JSON.stringify(Array.from(keypair.secretKey)));

console.log('✅ New pump-sniper wallet generated!');
console.log(`📍 Address: ${keypair.publicKey.toBase58()}`);
console.log(`📁 Path: ${walletPath}`);
console.log('\n💰 Fund this wallet with SOL before running the sniper!');
